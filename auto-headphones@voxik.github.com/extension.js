/* exported init */

const Gvc = imports.gi.Gvc;

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

        this._handle_default_sink_changed_id = this._mixer_control.connect('default-sink-changed', this._handle_default_sink_changed.bind(this));
    }

    _handle_default_sink_changed(mixer_control, id) {
        let mixer_stream = mixer_control.lookup_stream_id(id);

        // Only Sinks are of interest.
        if (!(mixer_stream instanceof Gvc.MixerSink)) return;

        _log(`* handle: default-sink-changed (${id})`);
        _log_mixer_stream(mixer_stream);

        if (this._original_sink && !mixer_stream.port.includes('headphone')) {
            _log("! External sink change");

            this._original_sink = null;
        }
    }

    _handle_stream_changed(mixer_control, id) {
        let mixer_stream = mixer_control.lookup_stream_id(id);

        // Only Sinks are of interest.
        if (!(mixer_stream instanceof Gvc.MixerSink)) return;

        _log(`* handle: stream-changed (${id})`);

        let default_sink = mixer_control.get_default_sink();

        if (mixer_stream != default_sink) {
            if (mixer_stream.port.includes('headphone')) {
                _log("! Headphones plugged in");

                if (this._handle_stream_changed_id) {
                    mixer_control.disconnect(this._handle_stream_changed_id);
                    this._handle_stream_changed_id = null;
                }

                this._original_sink = default_sink;

                mixer_control.set_default_sink(mixer_stream);
            }
        }
    }

    _handle_output_added(mixer_control, id) {
        _log(`* handle: output-added (${id})`);

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log_mixer_ui_device(mixer_ui_device);

        if (mixer_ui_device.port_name.includes('headphone')) {
            _log("! Headphones output added");

            // Stream might not be available yet, so wait for it.
            this._handle_stream_changed_id = this._mixer_control.connect('stream-changed', this._handle_stream_changed.bind(this));
        }
    }

    _handle_output_removed(mixer_control, id) {
        _log(`* handle: output-removed (${id})`);

        let mixer_ui_device = mixer_control.lookup_output_id(id);
        _log_mixer_ui_device(mixer_ui_device);

        if (this._original_sink && mixer_ui_device.port_name.includes('headphone')) {
            _log("! Headphone unplugged");

            // `set_default_sink` internaly reuse just `_original_sink.name`
            // therefore this should be safe call even if the
            // `_original_sink` is not valid anymore due to unplugged audio
            // device.
            mixer_control.set_default_sink(this._original_sink);

            this._original_sink = null;
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
        if (this._handle_stream_changed_id) {
            this._mixer_control.disconnect(this._handle_stream_changed_id);
            this._handle_stream_changed_id = null;
        }
        if (this._handle_default_sink_changed_id) {
            this._mixer_control.disconnect(this._handle_default_sink_changed_id);
            this._handle_default_sink_changed_id = null;
        }
    }
}

function init(extension = imports.misc.extensionUtils.getCurrentExtension(), mixer_control = imports.ui.status.volume.getMixerControl()) {
    Me = extension;

    return new Extension(mixer_control);
}

function _log_mixer_stream(mixer_stream) {
    if (mixer_stream) {
        _log(`(${mixer_stream.id}) ${mixer_stream.port}: ${mixer_stream.description} (${mixer_stream.name})`);
    }
    else
    {
        _log("null mixer_stream");
    }
}

function _log_mixer_ui_device(mixer_ui_device) {
    _log(`(${mixer_ui_device.get_id()}) ${mixer_ui_device.port_name}: ${mixer_ui_device.description} (${mixer_ui_device.origin})`);
}

function _log(msg) {
    log(`${Me && Me.metadata.name}: ${msg}`);
}

function _dump(obj, options = {}) {
    _log(`>>> dump: ${obj ? obj.constructor.name : "null"}`);
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
