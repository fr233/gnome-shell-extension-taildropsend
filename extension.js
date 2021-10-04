/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope this it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */


const { GObject, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;



const Me = ExtensionUtils.getCurrentExtension();

const Indicator = Me.imports.indicator.Indicator;
const TailDropSendService = Me.imports.TailDropSendService.TailDropSendService;

const Utils = Me.imports.utils;


const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

class SendAdapter {
    constructor(indicator, settings){
        this.indicator = indicator;
        this.settings = settings;
        this.sending_cnt = 0;
        this.sending_ctx = new Map();
    }

    destroy(){
        for(let cancellable of this.sending_ctx.keys()){
            cancellable.cancel();
        }
        this.sending_ctx = null;
    }

    _countUp(){
        this.sending_cnt = this.sending_cnt + 1;
        if(this.sending_cnt == 1){
            this.indicator._icon_bright();
        }
    }

    _countDown(){
        this.sending_cnt = this.sending_cnt - 1;
        if(this.sending_cnt == 0){
            this.indicator._icon_dim();
        }
    }

    prepare(cancellable, filepath_arr){
        let cb = (() => {
            cancellable.cancel();
        });
        cb.bind(this);
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            let menuItem = this.indicator.addSendingEntry(filepath_arr.join(" "), cb);
            this.sending_ctx.set(cancellable, menuItem);
            this._countUp();

            return GLib.SOURCE_REMOVE;
        });
    }

    sendComplete(cancellable){
        let menuItem =  this.sending_ctx.get(cancellable);
        delete this.sending_ctx[cancellable];

        this.indicator.moveEntry(menuItem, "sent");
        Main.notify("send completed");

        this._countDown();
    }

    cancelled(cancellable){
        let menuItem =  this.sending_ctx.get(cancellable);
        delete this.sending_ctx[cancellable];

        Main.notify("send cancelled");
        this.indicator.removeEntry(menuItem);
        this._countDown();
    }

    executeFailed(cancellable){
        let menuItem =  this.sending_ctx.get(cancellable);
        delete this.sending_ctx[cancellable];

        Main.notify("send failed");
        this.indicator.moveEntry(menuItem, "failed");

        this._countDown();
    }
}


class RecvAdapter {
    constructor(indicator, settings){
        this.indicator = indicator;
        this.settings = settings;
        this.sending_cnt = 0;
    }

    destroy(){

    }

    get_dst(){
        let home_dir = GLib.get_home_dir();
        let recvpath = this.settings.get_string("default-receive-path");
        if(recvpath.startsWith('$HOME') || recvpath.startsWith('/')){
            let realpath = recvpath.replace(/\$HOME/, home_dir);
            return realpath;
        } else {
            log("default-receive-path not an absolute path, using $HOME instead");
            return home_dir;
        }
    }

    _countUp(){

    }

    _countDown(){

    }

    prepare(cancellable){
        let cb = ()=>{
            cancellable.cancel();
        };
        cb.bind(this);

        this._settingsChangedId = this.settings.connect('changed', cb);

        this._countUp();
    }

    _disconnectSettings() {
        if (!this._settingsChangedId)
            return;
        this.settings.disconnect(this._settingsChangedId);
        this._settingsChangedId = null;
    }

    receiveComplete(cancellable, output){
        let lines = output.split("\n");
        let filenames = [];
        for(let line of lines){
            if(line.startsWith("wrote")){
                let name = line.split(" ")[1];
                filenames = filenames.concat(name);
            }
        }
        let labelText = filenames.join(" ")

        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            this.indicator.addReceivedEntry(labelText);
            return GLib.SOURCE_REMOVE;
        });
        
        Main.notify("receive completed");
        this._countDown();

        this._disconnectSettings();
    }

    cancelled(cancellable){
        this._countDown();
        this._disconnectSettings();
    }

    executeFailed(cancellable){
        this._countDown();
        this._disconnectSettings();
    }
}



class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        ExtensionUtils.initTranslations();
    }

    enable() {
    	Utils.install_fileManager_script();
        let settings = ExtensionUtils.getSettings();
        this._indicator = new Indicator(settings);
        let sendAdapter = new SendAdapter(this._indicator, settings);
        let recvAdapter= new RecvAdapter(this._indicator, settings);

        this.taildropSendService = new TailDropSendService(sendAdapter, recvAdapter);
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this.taildropSendService.destroy();

        this.taildropSendService = null;
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
