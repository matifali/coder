package workingdir_test

import (
	"testing"

	"github.com/spf13/afero"
	"github.com/stretchr/testify/require"
	"golang.org/x/xerrors"

	"github.com/coder/coder/v2/agent/usershell"
	"github.com/coder/coder/v2/agent/workingdir"
)

// homeEnvInfo reports a fixed home directory and otherwise delegates to
// SystemEnvInfo, isolating the tests from the host's real home directory.
type homeEnvInfo struct {
	usershell.SystemEnvInfo
	home string
}

func (e homeEnvInfo) HomeDir() (string, error) { return e.home, nil }

// errorEnvInfo reports an error from HomeDir to exercise the fallback
// error path.
type errorEnvInfo struct {
	usershell.SystemEnvInfo
	err error
}

func (e errorEnvInfo) HomeDir() (string, error) { return "", e.err }

func TestResolve(t *testing.T) {
	t.Parallel()

	const home = "/home/coder"
	ei := homeEnvInfo{home: home}

	t.Run("Exists", func(t *testing.T) {
		t.Parallel()
		fs := afero.NewMemMapFs()
		require.NoError(t, fs.MkdirAll("/work", 0o755))
		dir, err := workingdir.Resolve(fs, ei, "/work")
		require.NoError(t, err)
		require.Equal(t, "/work", dir)
	})

	t.Run("Missing", func(t *testing.T) {
		t.Parallel()
		dir, err := workingdir.Resolve(afero.NewMemMapFs(), ei, "/work")
		require.NoError(t, err)
		require.Equal(t, home, dir)
	})

	t.Run("Empty", func(t *testing.T) {
		t.Parallel()
		dir, err := workingdir.Resolve(afero.NewMemMapFs(), ei, "")
		require.NoError(t, err)
		require.Equal(t, home, dir)
	})

	t.Run("NotADirectory", func(t *testing.T) {
		t.Parallel()
		fs := afero.NewMemMapFs()
		require.NoError(t, afero.WriteFile(fs, "/work", []byte("file"), 0o600))
		dir, err := workingdir.Resolve(fs, ei, "/work")
		require.NoError(t, err)
		require.Equal(t, home, dir)
	})

	t.Run("HomeDirError", func(t *testing.T) {
		t.Parallel()
		ei := errorEnvInfo{err: xerrors.New("no home")}
		_, err := workingdir.Resolve(afero.NewMemMapFs(), ei, "")
		require.ErrorContains(t, err, "no home")
	})
}
