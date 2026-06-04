package agentcontainers

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"cdr.dev/slog/v3"
	"github.com/coder/coder/v2/agent/agentexec"
	"github.com/coder/coder/v2/agent/usershell"
	"github.com/coder/coder/v2/pty"
)

// CommandEnv is a function that returns the shell, working directory,
// and environment variables to use when executing a command. It takes
// an EnvInfoer and a pre-existing environment slice as arguments.
// This signature matches agentssh.Server.CommandEnv.
type CommandEnv func(ei usershell.EnvInfoer, addEnv []string) (shell, dir string, env []string, err error)

// commandEnvExecer is an agentexec.Execer that uses a CommandEnv to determine
// the working directory, environment, and PATH used when forwarding a command
// to another agentexec.Execer.
//
// Commands are forwarded as discrete argv entries; the wrapper does not
// interpolate arguments into a shell invocation. An earlier implementation
// built a `sh -c` script by quoting each argument with fmt.Sprintf("%q", arg),
// which let attacker-controlled values (such as Docker container labels)
// trigger shell expansion of $(...), backticks and $VAR. See SEC-101.
type commandEnvExecer struct {
	logger     slog.Logger
	commandEnv CommandEnv
	execer     agentexec.Execer
}

func newCommandEnvExecer(
	logger slog.Logger,
	commandEnv CommandEnv,
	execer agentexec.Execer,
) *commandEnvExecer {
	return &commandEnvExecer{
		logger:     logger,
		commandEnv: commandEnv,
		execer:     execer,
	}
}

// Ensure commandEnvExecer implements agentexec.Execer.
var _ agentexec.Execer = (*commandEnvExecer)(nil)

// prepare returns the command name, args, working directory and environment
// to hand to the wrapped Execer.
//
// The shell returned by CommandEnv is intentionally discarded: this layer no
// longer invokes a shell, so attacker-controlled argv elements cannot be
// reinterpreted as shell syntax. To preserve the previous behavior where
// PATH lookup happened inside the user's shell, the command name is resolved
// against the PATH in env rather than the agent process's PATH. If lookup
// fails, the original name is forwarded so the wrapped execer can surface a
// normal "executable not found" error.
func (e *commandEnvExecer) prepare(ctx context.Context, inName string, inArgs ...string) (name string, args []string, dir string, env []string) {
	_, dir, env, err := e.commandEnv(nil, nil)
	if err != nil {
		e.logger.Error(ctx, "get command environment failed", slog.Error(err))
		return inName, inArgs, "", nil
	}
	if resolved, err := lookPathInEnv(inName, env); err == nil {
		inName = resolved
	}
	return inName, inArgs, dir, env
}

func (e *commandEnvExecer) CommandContext(ctx context.Context, cmd string, args ...string) *exec.Cmd {
	name, args, dir, env := e.prepare(ctx, cmd, args...)
	c := e.execer.CommandContext(ctx, name, args...)
	c.Dir = dir
	c.Env = env
	return c
}

func (e *commandEnvExecer) PTYCommandContext(ctx context.Context, cmd string, args ...string) *pty.Cmd {
	name, args, dir, env := e.prepare(ctx, cmd, args...)
	c := e.execer.PTYCommandContext(ctx, name, args...)
	c.Dir = dir
	c.Env = env
	return c
}

// lookPathInEnv resolves a command name against the PATH found in env. It
// mirrors os/exec.LookPath but uses the supplied env instead of the calling
// process's PATH, so the result reflects the user's environment rather than
// the agent's.
//
// Names that already contain a path separator are returned unchanged; the
// caller is responsible for ensuring such names point at an executable.
//
// On Windows, lookup is delegated to exec.LookPath, which understands
// PATHEXT. The env-supplied PATH is ignored there.
func lookPathInEnv(name string, env []string) (string, error) {
	if name == "" {
		return "", &exec.Error{Name: name, Err: exec.ErrNotFound}
	}
	if strings.ContainsRune(name, filepath.Separator) {
		return name, nil
	}
	if runtime.GOOS == "windows" {
		return exec.LookPath(name)
	}
	var pathVar string
	var pathSet bool
	for _, kv := range env {
		k, v, ok := strings.Cut(kv, "=")
		if !ok {
			continue
		}
		if k == "PATH" {
			pathVar = v
			pathSet = true
		}
	}
	if !pathSet {
		return "", &exec.Error{Name: name, Err: exec.ErrNotFound}
	}
	for _, dir := range filepath.SplitList(pathVar) {
		if dir == "" {
			// POSIX: an empty PATH entry means the current directory.
			dir = "."
		}
		full := filepath.Join(dir, name)
		if isExecutable(full) {
			return full, nil
		}
	}
	return "", &exec.Error{Name: name, Err: exec.ErrNotFound}
}

// isExecutable reports whether path refers to a regular file with at least
// one execute bit set. Only used on non-Windows platforms.
func isExecutable(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	if !info.Mode().IsRegular() {
		return false
	}
	return info.Mode().Perm()&0o111 != 0
}
