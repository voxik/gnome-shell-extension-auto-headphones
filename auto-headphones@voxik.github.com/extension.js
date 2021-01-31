/* exported init */

var Me = null;

class Extension {
    constructor(mixer_control) {
        _log(`Initializing - Version ${Me.metadata.version}`);

        this._mixer_control = mixer_control;
    }

    enable() {
        _log(`Enabling - Version ${Me.metadata.version}`);

        this._handle_output_added_id = this._mixer_control.connect('output-added', this._handle_output_added.bind(this));
        this._handle_output_removed_id = this._mixer_control.connect('output-removed', this._handle_output_removed.bind(this));
        this._handle_active_output_update_id = this._mixer_control.connect('active-output-update', this._handle_active_output_update.bind(this));
    }

    _handle_output_added(mixer_control, id) {
        _log('* handle: output-added');

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log_mixer_ui_device(mixer_ui_device);

        // Do nothing when there is not default sink, because mixer_control
        // is probably not initialized yet.
        if (!mixer_control.get_default_sink()) return;

        if (mixer_ui_device.port_name.includes('headphone')) {
            this._headphone_stream = mixer_control.get_stream_from_device(mixer_ui_device)
            _log(this._headphone_stream);

            _log("! change_output: (" + id + ") " + mixer_ui_device.origin + " " + mixer_ui_device.description);
            this._original_stream = mixer_control.get_default_sink();

            // It could be tempting to use mixer_control.change_output()
            // instead, but unfortunately this triggers `active-output-update`
            // and therefore resets the state.
            mixer_control.set_default_sink(this._headphone_stream);
        }
    }

    _handle_output_removed(mixer_control, id) {
        _log('* handle: output-removed');

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log_mixer_ui_device(mixer_ui_device);

        if (mixer_control.get_default_sink() == this._headphone_stream) {
            mixer_control.set_default_sink(this._original_stream);
            this._headphone_stream = null;
            this._original_stream = null;
        }

    }

    _handle_active_output_update(mixer_control, id) {
        _log('* handle: active-output-update');

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log_mixer_ui_device(mixer_ui_device);

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
        _log(`Disabling - Version ${Me.metadata.version}`);

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
    }
}

function init(extension = imports.misc.extensionUtils.getCurrentExtension(), mixer_control = imports.ui.status.volume.getMixerControl()) {
    Me = extension;

    return new Extension(mixer_control);
}

function _log_mixer_ui_device(mixer_ui_device) {
    _log(`(${mixer_ui_device.get_id()}) ${mixer_ui_device.port_name}: ${mixer_ui_device.description} (${mixer_ui_device.origin})`);
}

function _log(msg) {
    log(`${Me && Me.metadata.name}: ${msg}`);
}

function _dump(obj, options = {}) {
    _log(`>>> dump`);
    var propValue;
    for (var propName in obj) {
        try {
            propValue = obj[propName];
            if ((`${propValue}`.search("function") >= 0) && !options.f) {
                continue;
            }
            _log(`  ${propName}: ${propValue}`);
        }
        catch(e) {
            _log(`  ${propName}: !!! ${e}`);
        }
    }
    _log(`<<<`);
}
