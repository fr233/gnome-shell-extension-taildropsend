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


const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;


const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Conf = Me.imports.conf;


function init() {

}

function buildPrefsWidget() {
    let settings = ExtensionUtils.getSettings(Conf.SCHEMA_NAME);
    let prefsWidget = new Gtk.Grid({
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });


    let title = new Gtk.Label({
        label: `<b>${Me.metadata.name} Preferences</b>`,
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, 0, 2, 1);


    let recvpathLabel = new Gtk.Label({
        label: 'Default receive directory',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(recvpathLabel, 0, 1, 1, 1);

    let pathEntry = new Gtk.Entry({
        text: settings.get_string ('default-receive-path')
    });

    let pathSaveBtn = new Gtk.Button({
        label: "Save"
    });

    pathSaveBtn.connect('clicked', ()=>{
        let path = pathEntry.get_text();
        settings.set_string('default-receive-path', path);
    });

    prefsWidget.attach(pathEntry, 1, 1, 1, 1);
    prefsWidget.attach(pathSaveBtn, 2, 1, 1, 1);

    // Bind the switch to the `show-indicator` key
    // this.settings.bind(
    //     'show-indicator',
    //     toggle,
    //     'active',
    //     Gio.SettingsBindFlags.DEFAULT
    // );

    // Return our widget which will be added to the window
    return prefsWidget;
}
