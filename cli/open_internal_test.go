package cli

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/coder/coder/v2/codersdk"
)

func Test_resolveAgentAbsPath(t *testing.T) {
	t.Parallel()

	type args struct {
		workingDirectory string
		relOrAbsPath     string
		agentOS          string
		local            bool
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{"ok no args", args{}, "", false},
		{"ok only working directory", args{workingDirectory: "/workdir"}, "/workdir", false},
		{"ok with working directory and rel path", args{workingDirectory: "/workdir", relOrAbsPath: "my/path"}, "/workdir/my/path", false},
		{"ok with working directory and abs path", args{workingDirectory: "/workdir", relOrAbsPath: "/my/path"}, "/my/path", false},
		{"ok with no working directory and abs path", args{relOrAbsPath: "/my/path"}, "/my/path", false},

		{"fail tilde", args{relOrAbsPath: "~"}, "", true},
		{"fail tilde with working directory", args{workingDirectory: "/workdir", relOrAbsPath: "~"}, "", true},
		{"fail tilde path", args{relOrAbsPath: "~/workdir"}, "", true},
		{"fail tilde path with working directory", args{workingDirectory: "/workdir", relOrAbsPath: "~/workdir"}, "", true},
		{"fail relative dot with no working directory", args{relOrAbsPath: "."}, "", true},
		{"fail relative with no working directory", args{relOrAbsPath: "workdir"}, "", true},

		{"ok with working directory and rel path on windows", args{workingDirectory: "C:\\workdir", relOrAbsPath: "my\\path", agentOS: "windows"}, "C:\\workdir\\my\\path", false},
		{"ok with working directory and abs path on windows", args{workingDirectory: "C:\\workdir", relOrAbsPath: "C:\\my\\path", agentOS: "windows"}, "C:\\my\\path", false},
		{"ok with no working directory and abs path on windows", args{relOrAbsPath: "C:\\my\\path", agentOS: "windows"}, "C:\\my\\path", false},
		{"ok abs unix path on windows", args{workingDirectory: "C:\\workdir", relOrAbsPath: "/my/path", agentOS: "windows"}, "\\my\\path", false},
		{"ok rel unix path on windows", args{workingDirectory: "C:\\workdir", relOrAbsPath: "my/path", agentOS: "windows"}, "C:\\workdir\\my\\path", false},

		{"fail with no working directory and rel path on windows", args{relOrAbsPath: "my\\path", agentOS: "windows"}, "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := resolveAgentAbsPath(tt.args.workingDirectory, tt.args.relOrAbsPath, tt.args.agentOS, tt.args.local)
			if (err != nil) != tt.wantErr {
				t.Errorf("resolveAgentAbsPath() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("resolveAgentAbsPath() = %v, want %v", got, tt.want)
			}
		})
	}
}

func Test_buildAppLinkURL(t *testing.T) {
	t.Parallel()

	for _, tt := range []struct {
		name string
		// function arguments
		baseURL           string
		workspace         codersdk.Workspace
		agent             codersdk.WorkspaceAgent
		app               codersdk.WorkspaceApp
		appsHost          string
		preferredPathBase string
		// expected results
		expectedLink string
	}{
		{
			name:    "external url",
			baseURL: "https://coder.tld",
			app: codersdk.WorkspaceApp{
				External: true,
				URL:      "https://external-url.tld",
			},
			expectedLink: "https://external-url.tld",
		},
		{
			name:    "without subdomain",
			baseURL: "https://coder.tld",
			workspace: codersdk.Workspace{
				Name:      "Test-Workspace",
				OwnerName: "username",
			},
			agent: codersdk.WorkspaceAgent{
				Name: "a-workspace-agent",
			},
			app: codersdk.WorkspaceApp{
				Slug:      "app-slug",
				Subdomain: false,
			},
			preferredPathBase: "/path-base",
			expectedLink:      "https://coder.tld/path-base/@username/Test-Workspace.a-workspace-agent/apps/app-slug/",
		},
		{
			name:    "with command",
			baseURL: "https://coder.tld",
			workspace: codersdk.Workspace{
				Name:      "Test-Workspace",
				OwnerName: "username",
			},
			agent: codersdk.WorkspaceAgent{
				Name: "a-workspace-agent",
			},
			app: codersdk.WorkspaceApp{
				Slug:    "my-terminal",
				Command: "ls -la",
			},
			expectedLink: "https://coder.tld/@username/Test-Workspace.a-workspace-agent/terminal?app=my-terminal",
		},
		{
			name:    "with subdomain",
			baseURL: "ftps://coder.tld",
			workspace: codersdk.Workspace{
				Name:      "Test-Workspace",
				OwnerName: "username",
			},
			agent: codersdk.WorkspaceAgent{
				Name: "a-workspace-agent",
			},
			app: codersdk.WorkspaceApp{
				Subdomain:     true,
				SubdomainName: "hellocoder",
			},
			preferredPathBase: "/path-base",
			appsHost:          "*.apps-host.tld",
			expectedLink:      "ftps://hellocoder.apps-host.tld/",
		},
		{
			name:    "with subdomain, but not apps host",
			baseURL: "https://coder.tld",
			workspace: codersdk.Workspace{
				Name:      "Test-Workspace",
				OwnerName: "username",
			},
			agent: codersdk.WorkspaceAgent{
				Name: "a-workspace-agent",
			},
			app: codersdk.WorkspaceApp{
				Slug:          "app-slug",
				Subdomain:     true,
				SubdomainName: "It really doesn't matter what this is without AppsHost.",
			},
			preferredPathBase: "/path-base",
			expectedLink:      "https://coder.tld/path-base/@username/Test-Workspace.a-workspace-agent/apps/app-slug/",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			baseURL, err := url.Parse(tt.baseURL)
			require.NoError(t, err)
			actual := buildAppLinkURL(baseURL, tt.workspace, tt.agent, tt.app, tt.appsHost, tt.preferredPathBase)
			assert.Equal(t, tt.expectedLink, actual)
		})
	}
}

func Test_resolveExternalAppURL(t *testing.T) {
	t.Parallel()

	deployment, err := url.Parse("https://coder.example.com")
	require.NoError(t, err)

	tests := []struct {
		name           string
		deploymentURL  *url.URL
		rawAppURL      string
		wantSanitized  string
		wantSubstitute bool
		wantErr        bool
		wantErrSubstr  string
	}{
		{
			name:           "allowed scheme without placeholder",
			deploymentURL:  deployment,
			rawAppURL:      "vscode://coder.coder-remote/open?owner=alice",
			wantSanitized:  "vscode://coder.coder-remote/open?owner=alice",
			wantSubstitute: true,
		},
		{
			name:           "allowed scheme with placeholder",
			deploymentURL:  deployment,
			rawAppURL:      "cursor://coder.coder-remote/open?token=$SESSION_TOKEN",
			wantSanitized:  "cursor://coder.coder-remote/open?token=$SESSION_TOKEN",
			wantSubstitute: true,
		},
		{
			name:           "allowed scheme mixed case",
			deploymentURL:  deployment,
			rawAppURL:      "VSCode://coder.coder-remote/open",
			wantSanitized:  "VSCode://coder.coder-remote/open",
			wantSubstitute: true,
		},
		{
			name:           "zed scheme is allowed",
			deploymentURL:  deployment,
			rawAppURL:      "zed://ssh/coder.workspace",
			wantSanitized:  "zed://ssh/coder.workspace",
			wantSubstitute: true,
		},
		{
			name:           "https same host with placeholder substitutes",
			deploymentURL:  deployment,
			rawAppURL:      "https://coder.example.com/dashboard?t=$SESSION_TOKEN",
			wantSanitized:  "https://coder.example.com/dashboard?t=$SESSION_TOKEN",
			wantSubstitute: true,
		},
		{
			name:           "https same host without placeholder substitutes",
			deploymentURL:  deployment,
			rawAppURL:      "https://coder.example.com/dashboard",
			wantSanitized:  "https://coder.example.com/dashboard",
			wantSubstitute: true,
		},
		{
			name:           "https same host mixed case",
			deploymentURL:  deployment,
			rawAppURL:      "https://Coder.Example.COM/dashboard",
			wantSanitized:  "https://Coder.Example.COM/dashboard",
			wantSubstitute: true,
		},
		{
			name:           "https external host without placeholder opens",
			deploymentURL:  deployment,
			rawAppURL:      "https://docs.example.org/welcome",
			wantSanitized:  "https://docs.example.org/welcome",
			wantSubstitute: false,
		},
		{
			name:          "https external host with placeholder refused",
			deploymentURL: deployment,
			rawAppURL:     "https://attacker.example/?t=$SESSION_TOKEN",
			wantErr:       true,
			wantErrSubstr: "leak the session token",
		},
		{
			name:          "http external host with placeholder refused",
			deploymentURL: deployment,
			rawAppURL:     "http://attacker.example/?t=$SESSION_TOKEN",
			wantErr:       true,
			wantErrSubstr: "leak the session token",
		},
		{
			name:          "file scheme refused",
			deploymentURL: deployment,
			rawAppURL:     "file:///etc/passwd",
			wantErr:       true,
			wantErrSubstr: "not in the allowed protocol list",
		},
		{
			name:          "mailto scheme refused",
			deploymentURL: deployment,
			rawAppURL:     "mailto:victim@example.com",
			wantErr:       true,
			wantErrSubstr: "not in the allowed protocol list",
		},
		{
			name:          "unknown custom scheme refused",
			deploymentURL: deployment,
			rawAppURL:     "slack://attacker",
			wantErr:       true,
			wantErrSubstr: "not in the allowed protocol list",
		},
		{
			name:          "unparseable URL refused",
			deploymentURL: deployment,
			rawAppURL:     "http://[::1",
			wantErr:       true,
			wantErrSubstr: "parse external app URL",
		},
		{
			name:          "nil deployment URL falls through to external check",
			deploymentURL: nil,
			rawAppURL:     "https://anywhere.example/?t=$SESSION_TOKEN",
			wantErr:       true,
			wantErrSubstr: "leak the session token",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			sanitized, substitute, err := resolveExternalAppURL(tt.deploymentURL, tt.rawAppURL)
			if tt.wantErr {
				require.Error(t, err)
				if tt.wantErrSubstr != "" {
					assert.Contains(t, err.Error(), tt.wantErrSubstr)
				}
				assert.Empty(t, sanitized)
				assert.False(t, substitute)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantSanitized, sanitized)
			assert.Equal(t, tt.wantSubstitute, substitute)
		})
	}
}
