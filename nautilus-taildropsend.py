"""
nautilus-gsconnect.py - A Nautilus extension for sending files via GSConnect.

A great deal of credit and appreciation is owed to the indicator-kdeconnect
developers for the sister Python script 'kdeconnect-send-nautilus.py':

https://github.com/Bajoja/indicator-kdeconnect/blob/master/data/extensions/kdeconnect-send-nautilus.py
"""

import gettext
import os.path
import sys

import gi
gi.require_version('Gio', '2.0')
gi.require_version('GLib', '2.0')
gi.require_version('GObject', '2.0')
from gi.repository import Gio, GLib, GObject


# Host application detection
#
# Nemo seems to reliably identify itself as 'nemo' in argv[0], so we
# can test for that. Nautilus detection is less reliable, so don't try.
# See https://github.com/linuxmint/nemo-extensions/issues/330
if "nemo" in sys.argv[0].lower():
    # Host runtime is nemo-python
    gi.require_version('Nemo', '3.0')
    from gi.repository import Nemo as FileManager
else:
    # Otherwise, just assume it's nautilus-python
    gi.require_version('Nautilus', '3.0')
    from gi.repository import Nautilus as FileManager


IFACE_NAME = 'com.drecol.TailDropSend'
OBJECT_PATH = '/com/drecol/TailDropSend'
BUS_NAME = 'org.gnome.Shell'

dbus = None
def get_dbus_conn():
    global dbus
    if dbus == None:
        dbus = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            None,
            BUS_NAME,
            OBJECT_PATH,
            IFACE_NAME,
            None)
    return dbus


class SendViaTaildropExtension(GObject.Object, FileManager.MenuProvider):
    """A context menu for sending files via GSConnect."""

    def __init__(self):
        """Initialize the DBus ObjectManager"""
        GObject.Object.__init__(self)


    def get_devices(self):
        devices = []
        try:
            import os
            r = os.popen("tailscale file cp -targets")
            lines = r.readlines()
            r.close()

            for line in lines:
                dev_name = line.split()[1]
                devices.append(dev_name)
        except:
            pass
    
        return devices

    def send_files(self, menu, name, files):
        """Send *files* to *device_id*"""
        
        dbus = get_dbus_conn()
        
        filelist = []
        for file in files:
            filepath = file.get_location().get_path()
            filelist.append(filepath)
        
        variant = GLib.Variant('(sas)', (name, filelist,))
        dbus.call_sync('sendFile', variant, 0, 300, None)  

        

    def get_file_items(self, window, files):
        """Return a list of select files to be sent"""

        # Only accept regular files
        for uri in files:
            if uri.get_uri_scheme() != 'file' or uri.is_directory():
                return ()

        # Enumerate capable devices
        devices = []
        
        devices.extend(self.get_devices())


        # No capable devices; don't show menu entry
        #if not devices:
        #    return ()

        # Context Menu Item
        menu = FileManager.MenuItem(
            name='SendViaTaildropExtension::Devices',
            label='Send via Taildrop',
        )

        # Context Submenu
        submenu = FileManager.Menu()
        menu.set_submenu(submenu)

        # Context Submenu Items
        for name in devices:
            item = FileManager.MenuItem(
                name='SendViaTaildropExtension::Device' + name,
                label=name
            )

            item.connect('activate', self.send_files, name, files)

            submenu.append_item(item)

        return (menu,)

