/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { IDebugService, State, IDebugConfiguration } from 'vs/workbench/contrib/debug/common/debug';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IStatusbarEntry, IStatusbarService, StatusbarAlignment, IStatusbarEntryAccessor } from 'vs/platform/statusbar/common/statusbar';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';


export class DebugStatusContribution implements IWorkbenchContribution {

	private showInStatusBar: 'never' | 'always' | 'onFirstSessionStart';
	private toDispose: IDisposable[] = [];
	private entryAccessor: IStatusbarEntryAccessor | undefined;

	constructor(
		@IStatusbarService private readonly statusBarService: IStatusbarService,
		@IDebugService readonly debugService: IDebugService,
		@IConfigurationService readonly configurationService: IConfigurationService
	) {

		const setShowInStatusBar = () => {
			this.showInStatusBar = configurationService.getValue<IDebugConfiguration>('debug').showInStatusBar;
			if (this.showInStatusBar === 'always' && !this.entryAccessor) {
				this.entryAccessor = this.statusBarService.addEntry(this.entry, StatusbarAlignment.LEFT, 30 /* Low Priority */);
			}
		};
		setShowInStatusBar();

		this.toDispose.push(this.debugService.onDidChangeState(state => {
			if (state !== State.Inactive && this.showInStatusBar === 'onFirstSessionStart' && !this.entryAccessor) {
				this.entryAccessor = this.statusBarService.addEntry(this.entry, StatusbarAlignment.LEFT, 30 /* Low Priority */);
			}
		}));
		this.toDispose.push(configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('debug.showInStatusBar')) {
				setShowInStatusBar();
				if (this.entryAccessor && this.showInStatusBar === 'never') {
					this.entryAccessor.dispose();
					this.entryAccessor = undefined;
				}
			}
		}));
		this.toDispose.push(this.debugService.getConfigurationManager().onDidSelectConfiguration(e => {
			if (this.entryAccessor) {
				this.entryAccessor.update(this.entry);
			}
		}));
	}

	private getText(): string {
		const manager = this.debugService.getConfigurationManager();
		const name = manager.selectedConfiguration.name || '';
		const nameAndLaunchPresent = name && manager.selectedConfiguration.launch;
		if (nameAndLaunchPresent) {
			return '$(play) ' + (manager.getLaunches().length > 1 ? `${name} (${manager.selectedConfiguration.launch!.name})` : name);
		}

		return '';
	}

	private get entry(): IStatusbarEntry {
		return {
			id: 'status.debug',
			name: nls.localize('status.debug', "Debug Configuration"),
			text: this.getText(),
			tooltip: nls.localize('selectAndStartDebug', "Select and start debug configuration"),
			command: 'workbench.action.debug.selectandstart'
		};
	}

	dispose(): void {
		if (this.entryAccessor) {
			this.entryAccessor.dispose();
		}
		dispose(this.toDispose);
	}
}
