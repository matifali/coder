// Package workingdir resolves the directory a session or process should
// start in. It is shared by agentssh and agentproc so their working
// directory resolution cannot drift.
package workingdir

import (
	"github.com/spf13/afero"

	"github.com/coder/coder/v2/agent/usershell"
)

// Resolve returns dir when it is non-empty and an existing directory on
// fs. Otherwise it falls back to the home directory reported by ei.
func Resolve(fs afero.Fs, ei usershell.EnvInfoer, dir string) (string, error) {
	if dir != "" {
		if info, err := fs.Stat(dir); err == nil && info.IsDir() {
			return dir, nil
		}
	}
	return ei.HomeDir()
}
