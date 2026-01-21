import {
	Buffer
} from "./buffer";
import {
	Notice,
	Plugin,
	ReferenceCache,
	TFile
} from "obsidian";
import {
	KindleSettingTab
} from "./settings";
import { fail } from "assert";



interface KindlePluginSettings {
	author: string;
	sendmail: string;
	kindlemail: string;
	port: string;
	smtphost: string;
	pass: string;
	expath: string;
	backend: string;
	user: string;
	toc: boolean;
	pagebreak: boolean;
	mergedown: boolean;
	ribbonicon: boolean;
	bulkFolder: string;
	bulkMode: boolean;
}

const DEFAULT_SETTINGS: Partial<KindlePluginSettings> = {

	author: "",
	sendmail: "",
	kindlemail: "",
	port: "",
	smtphost: "",
	pass: "",
	expath: "",
	backend: "https://staneks.de/apps/md2mobi/",
	bulkFolder: "",
	bulkMode: false,
	mergedown: false,
	toc: false,
	pagebreak: false,
	ribbonicon: true,
	user: ""

};



export default class Kindle extends Plugin {
	settings: KindlePluginSettings;
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new KindleSettingTab(this.app, this));
		if (this.settings.mergedown == true) {
			this.addCommand({
				id: 'Mergedown',
				name: 'Mergedown',
				callback: async () => {
					let Inhalt: string = "";
					let imagelist: string[] = [];
					let imagename: string[] = [];
					let links: Array<[string, number]> = [];
					let lang = localStorage.getItem("language");
					let dokument = this.app.workspace.getActiveFile();
					if (dokument == null || dokument.extension != "md") {
						new Notice("❌ No active .md file. Please open a .md file first!");
						return;
					}
					let Alllinks = this.app.metadataCache.resolvedLinks[dokument.path];
					links = Object.entries(Alllinks);
					let data = await this.app.vault.cachedRead(dokument)
					data = data.replace(/]]/g, "]]\n");
					let lines = data.split("\n")
					let result = await this.Mergedown(lines, Inhalt, imagelist, imagename, links);
					Inhalt = result.Inhalt;
					Inhalt = Inhalt.replace(/%%[\s\S]*?%%/g, "");
					Inhalt = Inhalt.replace("\n]]", "");
					let time = new Date().getTime();
					let expath = this.settings.expath;
					this.app.vault.createFolder(expath);
					this.app.vault.create(expath + '/' + dokument.basename + '_mergedown_' + time + '.md', Inhalt);
					if (lang == "de") {
						new Notice("✔️ Mergedown erfolgreich!");
					} else {
						new Notice("✔️ Mergedown successful!");
					}




				}
			});
		}



		this.addCommand({
			id: 'Export',
			name: 'Export',
			callback: () => {
				this.export();
			},
		});


		if (this.settings.ribbonicon == true) {
			this.addRibbonIcon("paper-plane", "send2E-Reader", () => {
				this.export();
			});
		}


	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	async getFile(text: string, links: Array<[string, number]>) {
		if (text.contains("![[") && text.contains("]]")) {
			let start = text.indexOf('![[');
			let end = text.indexOf(']]', start + 3);
			let name = text.substring(start + 3, end);
			name = "![[" + name + "]]";


			for (let i = 0; i < links.length; i++) {
				let foundLink = links[i][0];

				let chunk = foundLink.split('/');

				foundLink = chunk[chunk.length - 1];
				let extension = foundLink.split('.');
				foundLink = extension[0];

				if (name.contains(foundLink)) {


					var file = links[i][0];

					return [file, name];
				}
				else {
				}
			}

		}
		else {
			// lang is variable in this scope in original code but local vars are better.
			let lang = localStorage.getItem("language");

			if (lang == "de") {
				new Notice('❌ Dein Dokument enthält unaufgelöste Dateien. Bitte korrigiere das!');
			} else {
				new Notice('❌ Your document contains unresolved files. Please fix it!');
			}

			return null;
		}
	}

	async GetEbook(lines: string[], Inhalt: string, imagelist: string[], imagename: string[], links: Array<[string, number]>) {
		for (let i = 0; i < lines.length; i++) {
			let text = lines[i];



			if (text.contains('![[') && text.contains(']]') || text.contains('![') && text.contains(')')! && text.contains('http://')! && text.contains('https://')) {

				let fileArray = await this.getFile(text, links);
				if (!fileArray) continue;

				let FileLink = fileArray[1] as string;
				let filePath = fileArray[0] as string;
				let file = this.app.vault.getAbstractFileByPath(filePath) as TFile;

				if (!file) continue;

				if (file == this.app.workspace.getActiveFile()) {
					new Notice('❌ You can not embed the file in his own file');
					throw new Error("In the Moment it is not possible to embed the file in his own file");
				}

				if (file.extension == "png" || file.extension == "jpg" || file.extension == "jpeg" || file.extension == "gif" || file.extension == "svg" || file.extension == "bmp") {
					let data = await this.app.vault.readBinary(file);
					let base64 = Buffer.from(data).toString('base64');
					var filename = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
					imagename.push(filename);
					imagelist.push(base64);
					Inhalt += '\n<p><img class="intern" src="uploads/' + filename + '"></p>' + '\n\n';
				}

				if (file.extension == "mp3") {
					let data = await this.app.vault.readBinary(file);
					let base64 = Buffer.from(data).toString('base64');
					var filename = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
					imagename.push(filename);
					imagelist.push(base64);
					Inhalt += '\n<p><audio class="intern" type="audio/mpeg" src="uploads/' + filename + '" controls="controls"/></p>' + '\n\n';
				}

				if (file.extension == 'md') {
					let links2: Array<[string, number]> = [];
					let data = await this.app.vault.cachedRead(file);
					text = Buffer.from(data).toString('utf8');
					if (text.startsWith('---')) {
						let start = text.indexOf('---');
						let end = text.indexOf('---', start + 3);
						text = text.substring(end + 3);
					}



					let heading = "";
					let Iteration = 0; //Set Iterationcounter for each Link (Can't break iterateReferences)
					(this.app.metadataCache as any).iterateReferences((sourcePath: string, reference: ReferenceCache) => {
						if (reference.link.contains(file.basename) && reference.original == FileLink && Iteration == 0) {

							let ankerParts = reference.link.split('#');
							let ankerSplit = ankerParts.length;

							let ankerName = ankerParts[ankerParts.length - 1];
							heading = '<h3><i>' + reference.displayText + '</i></h3>\n';

							if (ankerName != undefined && ankerSplit > 1) {
								if (ankerName.contains("^")) {

									let ankercaret = text.indexOf(ankerName);
									text = text.substring(0, ankercaret);
									text = text.substring(text.lastIndexOf("\n"));
									heading = '';
								} else {
									let pos = text.indexOf(ankerName);
									if (pos == -1) {
										text = text.substring(pos);
									} else {

										text = text.substring(pos);
										text = text.replace(ankerName, '');


									}
									let pos2 = text.indexOf('\n#', 10);
									if (pos2 == -1) { } else {
										text = text.substring(0, pos2);
									}
								}

							}
							Iteration++;
						}



					});



					text = heading + text;
					let lines2 = text.split("\n");

					let nextmd = await this.GetEbook(lines2, Inhalt, imagelist, imagename, links2);
					Inhalt = nextmd.Inhalt;

				} else {

				}



			} else {

				if (text.contains('![') && text.contains(')') && text.contains('http://') || text.contains('![') && text.contains(')') && text.contains('https://')) {
					// get text between ()

					let ImageLink = text.substring(text.indexOf('(') + 1, text.indexOf(')'));
					Inhalt += '<p><img class="extern" src="' + ImageLink + '"></p> \n\n';
				}



				else {
					Inhalt += text + " \n\n";
				}
			}





		}

		return {
			Inhalt,
			imagelist,
			imagename
		};

	}

	async export() {
		if (this.settings.bulkMode) {
			let folderPath = this.settings.bulkFolder;
			if (!folderPath) {
				new Notice("Please set a Bulk Export Folder in settings!");
				return;
			}

			if (folderPath.endsWith("/")) folderPath = folderPath.slice(0, -1);

			let allFiles = this.app.vault.getFiles();
			let targetFiles = allFiles.filter(f => f.extension === "md" && f.path.startsWith(folderPath));

			if (targetFiles.length === 0) {
				new Notice(`No Markdown files found in folder: ${folderPath}`);
				return;
			}

			new Notice(`Starting Bulk Export of ${targetFiles.length} files from '${folderPath}'...`);

			for (let i = 0; i < targetFiles.length; i++) {
				let file = targetFiles[i];
				try {
					if (i % 5 === 0 && i > 0) new Notice(`Exporting ${i}/${targetFiles.length}...`);
					await this.processDocument(file);
					// Small delay
					await new Promise(r => setTimeout(r, 1000));
				} catch (e) {
					console.error(`Failed to export ${file.name}`, e);
					new Notice(`Failed to export ${file.name}`);
				}
			}
			new Notice("Bulk Export Complete!");
		} else {
			let activeFile = this.app.workspace.getActiveFile();
			if (activeFile == null || activeFile.extension != "md") {
				new Notice("❌ No active .md file. Please open a .md file first!");
				return;
			}
			await this.processDocument(activeFile);
		}
	}

	async processDocument(dokument: TFile) {
		let Inhalt: string = "";
		let imagelist: string[] = [];
		let imagename: string[] = [];
		let links: Array<[string, number]> = [];
		let lang = 'en';
		if (localStorage.getItem('language') !== null) {
			lang = localStorage.getItem("language");
		}

		let Alllinks = this.app.metadataCache.resolvedLinks[dokument.path];
		links = Object.entries(Alllinks);
		let data = await this.app.vault.cachedRead(dokument)

		// --- Front Matter Logic (Ported) ---
		let extractedAuthor = null;
		if (data.startsWith('---')) {
			let start = data.indexOf('---');
			let end = data.indexOf('---', start + 3);
			let frontmatterRaw = data.substring(start + 3, end);

			// Parse frontmatter manually
			let lines = frontmatterRaw.split("\n");
			let htmlOutput = '<div style="margin-bottom: 2em; padding: 10px; border-bottom: 1px solid #ccc; font-family: sans-serif;">';
			let hasContent = false;

			for (let line of lines) {
				let parts = line.split(":");
				if (parts.length >= 2) {
					let key = parts[0].trim();
					let val = parts.slice(1).join(":").trim();
					// Remove quotes
					val = val.replace(/^["'](.*)["']$/, '$1');

					if (key && val) {
						hasContent = true;
						if (key.toLowerCase() === 'author' || key.toLowerCase() === 'autor') {
							extractedAuthor = val;
						}
						htmlOutput += `<p style="margin: 5px 0;"><b>${key}</b>: ${val}</p>`;
					}
				}
			}
			htmlOutput += '</div>';

			if (hasContent) {
				data = htmlOutput + data.substring(end + 3);
			} else {
				data = data.substring(end + 3);
			}
		}
		// ------------------------------------

		data = data.replace(/]]/g, "]]\n");
		let lines = data.split("\n")
		let result = await this.GetEbook(lines, Inhalt, imagelist, imagename, links);
		Inhalt = result.Inhalt;
		imagelist = result.imagelist;
		imagename = result.imagename;
		Inhalt = Inhalt.replace(/%%[\s\S]*?%%/g, "");
		Inhalt = Inhalt.replace(/```dataviewjs[\s\S]*?```/g, "");
		Inhalt = Inhalt.replace(/==[\s\S]*?==/g, "<u>$&</u>");
		Inhalt = Inhalt.replace(/==/g, "");
		if (this.settings.pagebreak == true) {
			Inhalt = Inhalt.replace(/---/g, '---\n<p><div style="page-break-after: always;"></div></p>\n');
		}
		else {
		}
		let host = this.settings.smtphost;
		let port = this.settings.port;
		let pass = this.settings.pass;
		let kindlemail = this.settings.kindlemail;
		let sendmail = this.settings.sendmail;
		let author = extractedAuthor ? extractedAuthor : this.settings.author; // Use extracted author if available
		let user = this.settings.user;
		let toc = this.settings.toc;
		let backend = this.settings.backend;
		if (host == "" || port == "" || pass == "" || kindlemail == "" || sendmail == "" || author == "" || user == "" || backend == "") {
			if (lang == "de") {
				new Notice("Bitte ergänze die Einstellungen.");
			} else {
				new Notice("Please fill in the settings!");
			}
			return;
		}
		if (lang == "de") {
			new Notice('😃 Dein Dokument ' + dokument.basename + ' wird nun exportiert.');
		} else {
			new Notice('😃 Your Note ' + dokument.basename + ' is being converted to an ebook');
		}
		var url = this.settings.backend;
		var formData = new FormData();
		for (let i = 0; i < imagelist.length; i++) {
			formData.append('file' + i, imagelist[i]);


		}

		formData.append('lang', lang);
		// Assuming imagename is string[], join it for form data to be safe, though orig code might have relied on auto-toString
		formData.append('Bilder', imagename.join(','));

		formData.append('text', '#' + dokument.basename + '\n' + Inhalt);
		formData.append('title', dokument.basename);
		formData.append('author', author);
		formData.append('email', sendmail);
		formData.append('kindle', kindlemail);
		formData.append('port', port);
		formData.append('host', host);
		formData.append('pass', pass);
		formData.append('user', user);
		formData.append('toc', toc ? 'true' : 'false');
		await fetch(url, {
			method: 'POST',
			body: formData,
		})
			.then(function (response) {
				return response.text();
			})
			.then(function (body) {
				new Notice(body);
			})
			.catch(function () {
				new Notice("❌ Internetconnection error or Server is offline");
			});

	}


	async Mergedown(lines: string[], Inhalt: string, imagelist: string[], imagename: string[], links: Array<[string, number]>) {
		for (let i = 0; i < lines.length; i++) {
			let text = lines[i];

			if (text.contains('![[') && text.contains(']]') || text.contains('![') && text.contains(')')! && text.contains('http://')! && text.contains('https://')) {

				let fileArray = await this.getFile(text, links);
				if (!fileArray) continue;
				let FileLink = fileArray[1] as string;
				let filePath = fileArray[0] as string;
				let file = this.app.vault.getAbstractFileByPath(filePath) as TFile;

				if (!file) continue;

				if (file == this.app.workspace.getActiveFile()) {
					new Notice('❌ You can not embed the file in his own file');
					throw new Error("In the Moment it is not possible to embed the file in his own file");
				}

				if (file.extension == "png" || file.extension == "jpg" || file.extension == "jpeg" || file.extension == "gif" || file.extension == "svg" || file.extension == "bmp") {
					let data = await this.app.vault.readBinary(file);
					let base64 = Buffer.from(data).toString('base64');
					imagename.push(file.name);
					imagelist.push(base64);
					Inhalt += '\n![' + file.name + '](data:image/' + file.extension + ';base64,' + base64 + ')\n';
				}

				if (file.extension == "mp4" || file.extension == "webm" || file.extension == "ogv" || file.extension == "avi" || file.extension == "mov" || file.extension == "wmv" || file.extension == "mpg" || file.extension == "mpeg" || file.extension == "mkv" || file.extension == "flv" || file.extension == "swf" || file.extension == "vob" || file.extension == "m4v" || file.extension == "m4a" || file.extension == "m4b" || file.extension == "m4r" || file.extension == "3gp" || file.extension == "3g2" || file.extension == "f4v" || file.extension == "f4a" || file.extension == "f4b") {
					let data = await this.app.vault.readBinary(file);
					let base64 = Buffer.from(data).toString('base64');
					Inhalt += '\n<video controls><source src="data:video/' + file.extension + ';base64,' + base64 + '" type="video/' + file.extension + '"></video>\n';
				}

				if (file.extension == "mp3" || file.extension == "ogg" || file.extension == "wav" || file.extension == "flac") {
					let data = await this.app.vault.readBinary(file);
					let base64 = Buffer.from(data).toString('base64');
					Inhalt += '\n<audio controls><source src="data:audio/' + file.extension + ';base64,' + base64 + '" type="audio/' + file.extension + '"></audio>\n';
				}


				if (file.extension == 'md') {
					let links2: Array<[string, number]> = [];
					let data = await this.app.vault.cachedRead(file);
					text = Buffer.from(data).toString('utf8');
					if (text.startsWith('---')) {
						let start = text.indexOf('---');
						let end = text.indexOf('---', start + 3);
						text = text.substring(end + 3);
					}



					let heading = "";
					let Iteration = 0; //Set Iterationcounter for each Link (Can't break iterateReferences)
					(this.app.metadataCache as any).iterateReferences((sourcePath: string, reference: ReferenceCache) => {
						if (reference.link.contains(file.basename) && reference.original == FileLink && Iteration == 0) {

							let ankerParts = reference.link.split('#');
							let ankerSplit = ankerParts.length;

							let ankerName = ankerParts[ankerParts.length - 1];
							heading = '<h3><i>' + reference.displayText + '</i></h3>\n';

							if (ankerName != undefined && ankerSplit > 1) {
								if (ankerName.contains("^")) {

									let ankercaret = text.indexOf(ankerName);
									text = text.substring(0, ankercaret);
									text = text.substring(text.lastIndexOf("\n"));
									heading = '';
								} else {
									let pos = text.indexOf(ankerName);
									if (pos == -1) {
										text = text.substring(pos);
									} else {

										text = text.substring(pos);

										text = text.replace(ankerName, '');


									}
									let pos2 = text.indexOf('\n#', 10);
									if (pos2 == -1) { } else {
										text = text.substring(0, pos2);
									}
								}

							}
							Iteration++;
						}



					});



					text = heading + text;
					let lines2 = text.split("\n");

					let nextmd = await this.Mergedown(lines2, Inhalt, imagelist, imagename, links2);
					Inhalt = nextmd.Inhalt;

				}

			} else {

				if (text.contains('![') && text.contains(')') && text.contains('http://') || text.contains('![') && text.contains(')') && text.contains('https://')) {
					// get text between ()

					Inhalt += text + "\n";
				}



				else {
					Inhalt += text + "\n";
				}
			}
		}

		return {
			Inhalt,
			imagelist,
			imagename
		};

	}



}