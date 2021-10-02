const { Gio, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function install_fileManager_script(){
    const dataDir = GLib.get_user_data_dir();
    const pkgdataDir = Me.path;
    const target = `${pkgdataDir}/nautilus-taildropsend.py`;
    const fileManagers = [
        [`${dataDir}/nautilus-python/extensions`, 'nautilus-taildropsend.py'],
        [`${dataDir}/nemo-python/extensions`, 'nemo-taildropsend.py'],
    ];
    
    for (const [dir, name] of fileManagers) {
        const script = Gio.File.new_for_path(GLib.build_filenamev([dir, name]));

        if (!script.query_exists(null)) {
            GLib.mkdir_with_parents(dir, 0o755);
            script.make_symbolic_link(target, null);
        }
    }
}
