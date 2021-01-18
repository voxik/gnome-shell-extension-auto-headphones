/* exported init */

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const VolumeMenu = imports.ui.status.volume;
const GLib = imports.gi.GLib;

class Extension {
    constructor(meta) {
        this._meta = meta;

        _log(`Initializing - Version ${this._meta.version}`);
    }

    enable() {
        _log(`Enabling - Version ${this._meta.version}`);

        this._mixer_control = VolumeMenu.getMixerControl();

        this._handle_output_added_id = this._mixer_control.connect('output-added', this._handle_output_added.bind(this));
        this._handle_output_removed_id = this._mixer_control.connect('output-removed', this._handle_output_removed.bind(this));
        this._handle_active_output_update_id = this._mixer_control.connect('active-output-update', this._handle_active_output_update.bind(this));
    }

    _handle_output_added(mixer_control, id) {
        _log('* handle: output-added');

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log(`(${id}) ${mixer_ui_device.port_name}: ${mixer_ui_device.description} (${mixer_ui_device.origin})`)

        if (mixer_ui_device.port_name.includes('headphone')) {
            this._headphone_stream = mixer_control.get_stream_from_device(mixer_ui_device)
            _log(this._headphone_stream);

            _log("! change_output: (" + id + ") " + mixer_ui_device.origin + " " + mixer_ui_device.description);
            this._original_stream = mixer_control.get_default_sink();
            mixer_control.set_default_sink(this._headphone_stream);
        }
    }

    _handle_output_removed(mixer_control, id) {
        _log('* handle: output-removed');

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log(`(${id}) ${mixer_ui_device.port_name}: ${mixer_ui_device.description} (${mixer_ui_device.origin})`)

        if (mixer_control.get_default_sink() == this._headphone_stream) {
            this._headphone_stream = null;
            mixer_control.set_default_sink(this._original_stream);
        }

    }

    _handle_active_output_update(mixer_control, id) {
        _log('* handle: active-output-update');

        let default_stream = mixer_control.get_default_sink();

        _log(`default_stream: ${default_stream}`);
        _log(`original_stream: ${this._original_stream}`);
        _log(`headphone_stream: ${this._headphone_stream}`);

        if (default_stream != this._headphone_stream) {
            this._original_stream = null;
            this._headphone_stream = null;
        }
    }

    disable() {
        _log(`Disabling - Version ${this._meta.version}`);

        if (this._handle_output_added_id) {
            this._mixer_control.disconnect(this._handle_output_added_id);
            this._handle_output_added_id = null;
        }
        if (this._handle_output_removed_id) {
            this._mixer_control.disconnect(this._handle_output_removed_id);
            this._handle_output_removed_id = null;
        }
        if (this._handle_active_output_update_id) {
            this._mixer_control.disconnect(this._handle_active_output_update_id)
            this._handle_active_output_update_id = null;
        }

        this._mixer_control = null;
    }
}

function init(extension) {
    return new Extension(extension.metadata);
}

function _log(msg) {
    log(`${Me.metadata.name}: ${msg}`);
}

function _dump(obj) {
    var propValue;
    for (var propName in obj) {
        try {
            propValue = obj[propName];
            _log(`${propName}: ${propValue}`);
        }
        catch(e) { _log(`${propName}: !!!Error!!!`);
	}
    }
}
