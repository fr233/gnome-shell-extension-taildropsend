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
 
const { GObject, St , GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const subproc = Me.imports.subproc;



let servicePath = '/com/drecol/TailDropSend';

const ifaceXml = '<node> \
<interface name="com.drecol.TailDropSend"> \
<method name="sendFile"> \
    <arg type="s" direction="in" /> \
    <arg type="as" direction="in" /> \
</method> \
</interface> \
</node>';



function _verifyFilePath(str){
    if(str.charAt(0) == "/"){
        return true;
    } else {
        return false;
    }
}


var TailDropSendService = GObject.registerClass(
class TailDropSendService extends GObject.Object {

    _init(sendAdapter, recvAdapter) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(ifaceXml, this);
        this._dbusImpl.export(Gio.DBus.session, servicePath);

        this.sender = new Sender(sendAdapter); 
        this.receiver = new Receiver(recvAdapter);

        this.receiver.receive();
    }

    destroy() {
        this._dbusImpl.unexport();
        this.sender.destroy();
        this.sender = null;

        this.receiver.destroy();
        this.receiver = null;

    }

    verify(device, filepath_arr){
        if(filepath_arr.every(_verifyFilePath)){
            return true;
        }
        return false;
    }

    sendFile(device, filepath_arr) {
        if(! this.verify(device, filepath_arr)){
            Main.notify("verification failed");
        }

        try{
            log("sendFile" + filepath_arr.join(" "));
            this.sender.send(device, filepath_arr);
        } catch(err){
            Main.notify("unexpected error" + String(err));
        }

        
    }
});



class Receiver {
    constructor(adapter){
        this.destroyed = false;
        this.adapter = adapter;
        this.cancellable_reuse = new Gio.Cancellable();
    }

    destroy(){
        this.destroyed = true;
        this.cancellable_reuse.cancel();
        this.cancellable_reuse = null;

        this.adapter.destroy();
        this.adapter = null;
    }

    _make_cmd(dst){
        let args = ["tailscale", "file", "get", "--verbose", "--wait"];
        args = args.concat(dst);
        return args;
    }

    async receive(){
        let executeFailedCnt = 0;
        let adapter = this.adapter;
        while(! this.destroyed){
            if(executeFailedCnt > 2){
                log("tailscale file get execute failed too many times");
                break;
            }
            try {
                let dst = adapter.get_dst();
                let cmd = this._make_cmd(dst);

                adapter.prepare(this.cancellable_reuse);
                let [stdout, stderr] = await subproc.execCommunicate(cmd, null, this.cancellable_reuse);
                adapter.receiveComplete(this.cancellable_reuse, stderr);
            } catch (err){
                log(String(err.code) + " " + err);
                if(err instanceof Gio.IOErrorEnum){ 
                    if(err.code == Gio.IOErrorEnum.CANCELLED){  // cancelled before exec
                        adapter.cancelled(this.cancellable_reuse);
                    } else {  //execv success but exit code not 0
                        adapter.executeFailed(this.cancellable_reuse);
                        executeFailedCnt = executeFailedCnt + 1;
                    }
                } else if(err instanceof GLib.SpawnError){    
                    if(err.code == GLib.SpawnError.FAILED){ // execv success but killed
                        adapter.cancelled(this.cancellable_reuse);
                    } else { // exec error
                        adapter.executeFailed(this.cancellable_reuse);
                        executeFailedCnt = executeFailedCnt + 1;
                    }
                } else if(err instanceof GLib.Error){  
                    adapter.executeFailed(this.cancellable_reuse);
                    executeFailedCnt = executeFailedCnt + 1;
                } else {
                    executeFailedCnt = executeFailedCnt + 1;
                }
            } finally {
                this.cancellable_reuse.reset();
            }
        }
    }

}




class Sender {
    constructor(adapter){
        this.adapter = adapter;
    }

    destroy(){
        this.adapter.destroy();
        this.adapter = null;
    }

    _make_cmd(device, filepath_arr){
        let args = ["tailscale", "file", "cp"];
        args = args.concat(filepath_arr);
        args = args.concat([device + ":"]);
        return args;
    }
    
    async send(device, filepath_arr){
        let adapter = this.adapter;
        let cmd = this._make_cmd(device, filepath_arr);
        let cancellable = new Gio.Cancellable();

        try {
            adapter.prepare(cancellable, filepath_arr);
            await subproc.execCheck(cmd, cancellable);

            adapter.sendComplete(cancellable);
        } catch (err){
            log(err);
            if(err instanceof Gio.IOErrorEnum){ 
                if(err.code == Gio.IOErrorEnum.CANCELLED){  // cancelled before exec
                    adapter.cancelled(cancellable);
                }
            } else if(err instanceof GLib.SpawnError){ 
                 
                if(err.code == GLib.SpawnError.FAILED){ // execv success but killed
                    adapter.cancelled(cancellable);
                } else { // exec error
                    adapter.executeFailed(cancellable);
                }
            } else if(err instanceof GLib.Error){  //execv success but exit code not 0
                adapter.executeFailed(cancellable);
            } else {

            }
        } finally {

        }

    }

}
