function setupKeybindings(): void {
  document.addEventListener('keydown', async (e: KeyboardEvent) => {
    const meta = e.metaKey;
    if (!meta) return;

    switch (e.key) {
      case 't': {
        e.preventDefault();
        const ws = await window.kernel.workspaces.getActiveWorkspace();
        await window.kernel.tabs.createTab({ active: true, workspaceId: ws.id });
        break;
      }

      case 'w': {
        e.preventDefault();
        const activeTab = await window.kernel.tabs.getActiveTab();
        if (activeTab) {
          await window.kernel.tabs.closeTab(activeTab.id);
        }
        break;
      }

      case 'l': {
        e.preventDefault();
        const omnibar = document
          .querySelector('bb-app')
          ?.shadowRoot?.querySelector('bb-toolbar')
          ?.shadowRoot?.querySelector('bb-omnibar') as HTMLElement | null;
        omnibar?.focus();
        break;
      }

      case 'r': {
        e.preventDefault();
        const tab = await window.kernel.tabs.getActiveTab();
        if (tab) {
          await window.kernel.tabs.reload(tab.id);
        }
        break;
      }
    }
  });
}

setupKeybindings();

// Listen for focus-omnibar IPC from native menu
if ((window as any).__electronOn) {
  (window as any).__electronOn('kernel:focus-omnibar', () => {
    const omnibar = document
      .querySelector('bb-app')
      ?.shadowRoot?.querySelector('bb-toolbar')
      ?.shadowRoot?.querySelector('bb-omnibar') as HTMLElement | null;
    omnibar?.focus();
  });
}
