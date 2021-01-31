#!/usr/bin/gjs

// Test extension functionality outside of gnome-shell session.

const GIRepository = imports.gi.GIRepository;

// Add gnome-shell on load path to make Gvc available.
GIRepository.Repository.prepend_search_path('/usr/lib64/gnome-shell');
GIRepository.Repository.prepend_library_path('/usr/lib64/gnome-shell');

const { Gio, GLib, Gvc } = imports.gi;


// Add extension directory on load path.
const extension_directory = GLib.build_filenamev([getCurrentDirectory(), 'auto-headphones@voxik.github.com']);
imports.searchPath.unshift(extension_directory);


// Load extension metadata.
let metadata;
let [ok, content] = GLib.file_get_contents(GLib.build_filenamev([extension_directory, 'metadata.json']));
metadata = JSON.parse(imports.byteArray.toString(content));


// Initialize MixerControl.
let mixer_control = new Gvc.MixerControl({ name: metadata.name });
mixer_control.open();


// Initialize extension.
extensionModule = imports.extension
let extension = extensionModule.init({metadata: metadata}, mixer_control);


// Enable extension.
extension.enable();


// Run the main loop to let the handlers do their job.
const loop = new GLib.MainLoop(null, false);
loop.run();



function getCurrentDirectory() {
    let stack = (new Error()).stack;

    // Assuming we're importing this directly from an extension (and we shouldn't
    // ever not be), its UUID should be directly in the path here.
    let stackLine = stack.split('\n')[1];
    if (!stackLine)
        throw new Error('Could not find current file');

    // The stack line is like:
    //   init([object Object])@/home/user/data/gnome-shell/extensions/u@u.id/prefs.js:8
    //
    // In the case that we're importing from
    // module scope, the first field is blank:
    //   @/home/user/data/gnome-shell/extensions/u@u.id/prefs.js:8
    let match = new RegExp('@(.+):\\d+').exec(stackLine);
    if (!match)
        throw new Error('Could not find current file');

    let path = match[1];
    let file = Gio.File.new_for_path(path);
    return file.get_parent().get_path();
}
