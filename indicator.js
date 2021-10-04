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

const { GObject, St , GLib } = imports.gi;


const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Clutter    = imports.gi.Clutter;

const Me = ExtensionUtils.getCurrentExtension();
const Conf = Me.imports.conf;
const Gettext = imports.gettext.domain(Conf.GETTEXT_DOMAIN);
const _ = Gettext.gettext;

let MAX_ENTRY_LENGTH     = 50;

var Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init(settings) {
        super._init(0.0, _('Taildrop Send Indicator'));

        this.settings = settings;

        let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        this.icon = new St.Icon({
            icon_name: 'mail-send-symbolic',
            style_class: 'system-status-icon dim',
        });
        hbox.add_child(this.icon);

        this.add_child(hbox);

        this._buildMenu();
    }

    _icon_dim(){
        this.icon.add_style_class_name("dim");
    }
    
    _icon_bright(){
        this.icon.remove_style_class_name("dim");
    }

    _addSection(name){
        let seperator = new PopupMenu.PopupSeparatorMenuItem(name);
        let section = new PopupMenu.PopupMenuSection();
        let scrollViewMenuSection = new PopupMenu.PopupMenuSection();
        let scrollView = new St.ScrollView({
            style_class: 'tds-menu-section',
            overlay_scrollbars: true
        });
        scrollView.add_actor(section.actor);
        scrollViewMenuSection.actor.add_actor(scrollView);

        this.menu.addMenuItem(seperator);
        this.menu.addMenuItem(scrollViewMenuSection);

        return section;
    }

    _buildMenu(){
        this._entryItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });

        let label = new St.Label({
            style_class: 'tds-appname-label',
            x_align: Clutter.ActorAlign.CENTER,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            text: 'TailDropSend'
        });
        this._entryItem.add(label);
        this.menu.addMenuItem(this._entryItem);
// sending
        let sendingSection = this._addSection("sending");
        this.sendingSection = sendingSection;
            
// sent
        let sentSection = this._addSection("sent");
        this.sentSection = sentSection;

// failed
        let failedSection= this._addSection("failed");
        this.failedSection = failedSection;

// receiving
        let receivingSection = this._addSection("receiving");
        this.receivingSection = receivingSection;
//received
        let receivedSection = this._addSection("received");
        this.receivedSection = receivedSection;
    
    }
    
    _truncate(string, length) {
        let shortened = string.replace(/\s+/g, ' ');

        if (shortened.length > length)
            shortened = shortened.substring(0,length-1) + '...';

        return shortened;
    }

    moveEntry(menuItem, which){
        let buffer = menuItem.label.get_text();
        this.removeEntry(menuItem);
        this.addOtherEntry(buffer, which);
    }

    makeEntry(buffer, iconName){
        let menuItem = new PopupMenu.PopupMenuItem('');
        menuItem.menu = this.menu;
        menuItem.label.set_text(this._truncate(buffer, MAX_ENTRY_LENGTH));

        let icon = new St.Icon({
            icon_name: iconName,
            style_class: 'system-status-icon'
        });

        let icoBtn = new St.Button({
            style_class: 'ci-action-btn',
            can_focus: true,
            child: icon,
            x_align: Clutter.ActorAlign.END,
            x_expand: true,
            y_expand: true
        });

        menuItem.actor.add_child(icoBtn);
        menuItem.icoBtn = icoBtn;

        return menuItem;

    }

    addOtherEntry(buffer, which){
        let menuItem = this.makeEntry(buffer, 'object-select-symbolic');

        let cb = ()=>{
            this.removeEntry(menuItem);
        }
        cb.bind(this);
        menuItem.deletePressId = menuItem.icoBtn.connect('button-press-event', cb);
        
        if(which == "sent"){
            this.sentSection.addMenuItem(menuItem, 0);
        } else if(which == "failed"){
            this.failedSection.addMenuItem(menuItem, 0);
        }
    }
    
    addSendingEntry(buffer, onBtnClick){
        let menuItem = this.makeEntry(buffer, 'edit-delete-symbolic');
        menuItem.deletePressId = menuItem.icoBtn.connect('button-press-event', onBtnClick);
        this.sendingSection.addMenuItem(menuItem, 0);
        return menuItem;
    }

    addRecevingEntry(buffer, onBtnClick){
        let menuItem = this.makeEntry(buffer, 'edit-delete-symbolic');
        menuItem.deletePressId = menuItem.icoBtn.connect('button-press-event', onBtnClick);
        this.receivingSection.addMenuItem(menuItem, 0);
        return menuItem;
    }
    
    addReceivedEntry(buffer){
        let menuItem = this.makeEntry(buffer, 'object-select-symbolic');

        let cb = ()=>{
            this.removeEntry(menuItem);
        }
        cb.bind(this);

        menuItem.deletePressId = menuItem.icoBtn.connect('button-press-event', cb);
        this.receivedSection.addMenuItem(menuItem, 0);
    }
    
    removeEntry(menuItem) {
        menuItem.destroy();
    }

});
