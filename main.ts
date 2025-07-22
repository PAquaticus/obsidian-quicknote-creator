import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  Notice,
  TFolder,
} from "obsidian";

interface QuickNoteSettings {
  targetFolder: string;
}

const DEFAULT_SETTINGS: QuickNoteSettings = {
  targetFolder: "",
};

export default class QuickNotePlugin extends Plugin {
  settings: QuickNoteSettings;

  async onload() {
    await this.loadSettings();

    // Add ribbon icon
    this.addRibbonIcon("file-plus", "Create Quick Note", (evt: MouseEvent) => {
      this.createQuickNote();
    });

    // Add command
    this.addCommand({
      id: "create-quick-note",
      name: "Create Quick Note",
      callback: () => {
        this.createQuickNote();
      },
    });

    // Add hotkey command (you can assign a hotkey to this in settings)
    this.addCommand({
      id: "create-quick-note-hotkey",
      name: "Create Quick Note (Hotkey)",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "n" }],
      callback: () => {
        this.createQuickNote();
      },
    });

    // Add settings tab
    this.addSettingTab(new QuickNoteSettingTab(this.app, this));
  }

  async createQuickNote() {
    if (!this.settings.targetFolder) {
      new Notice("Please set a target folder in settings");
      return;
    }

    try {
      // Get the target folder
      const targetFolder = this.settings.targetFolder;

      // Ensure folder exists
      const folderExists = this.app.vault.getAbstractFileByPath(targetFolder);
      if (!folderExists) {
        await this.app.vault.createFolder(targetFolder);
      }

      // Get all files in the target folder
      const files = this.app.vault
        .getFiles()
        .filter(
          (file) =>
            file.path.startsWith(targetFolder + "/") &&
            file.path.split("/").length === targetFolder.split("/").length + 1,
        );

      // Find the next number
      let maxNum = 0;
      files.forEach((file) => {
        const fileName = file.basename;
        // Match files that start with just a number (and optional space)
        const match = fileName.match(/^(\d+)(\s|$)/);
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNum) {
            maxNum = num;
          }
        }
      });

      // Create the new file name (just the number)
      const fileName = `${maxNum + 1}.md`;
      const filePath = `${targetFolder}/${fileName}`;

      // Create the file with a basic template
      const content = ``;
      const newFile = await this.app.vault.create(filePath, content);

      // Open the file in a new tab
      const leaf = this.app.workspace.getLeaf("tab");
      await leaf.openFile(newFile);

      new Notice(`Created: ${fileName}`);
    } catch (error) {
      console.error("Error creating note:", error);
      new Notice("Error creating note. Check console for details.");
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class QuickNoteSettingTab extends PluginSettingTab {
  plugin: QuickNotePlugin;

  constructor(app: App, plugin: QuickNotePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Quick Note Creator Settings" });

    let folderOptions: Record<string, string> = { "": "" };
    this.app.vault.getAllFolders(true).forEach((folder: TFolder) => {
      folderOptions[folder.path] = folder.path;
    });

    new Setting(containerEl)
      .setName("Target Folder")
      .setDesc("Folder where numbered notes will be created")
      .addDropdown((dropdownComponent) =>
        dropdownComponent
          .setValue(this.plugin.settings.targetFolder ?? "")
          .addOptions(folderOptions)
          .onChange(async (value) => {
            this.plugin.settings.targetFolder = value;
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("p", {
      text: "Note: Files will be created as numbered files (1.md, 2.md, 3.md, etc.) and opened in new tabs with cursor positioned in the header.",
    });

    containerEl.createEl("p", {
      text: 'You can assign a custom hotkey to "Create Quick Note (Hotkey)" in Obsidian\'s hotkey settings. Default is Cmd/Ctrl + Shift + N.',
    });
  }
}
