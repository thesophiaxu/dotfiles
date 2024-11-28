const { Gtk, GLib, Gio } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Battery from 'resource:///com/github/Aylur/ags/service/battery.js';

import WindowTitle from "./normal/spaceleft.js";
import Indicators from "./normal/spaceright.js";
import Music from "./normal/music.js";
import System from "./normal/system.js";
import { enableClickthrough } from "../.widgetutils/clickthrough.js";
import { RoundedCorner } from "../.commonwidgets/cairo_roundedcorner.js";
import { currentShellMode } from '../../variables.js';


export function Scroller() {
    const decoder = new TextDecoder();
    const mode_label = Widget.Label({
        class_name: "scroller-mode",
        label: ''
    });
    const overview_label = Widget.Label({
        class_name: "scroller-overview",
        label: ''
    });
    const trailmark_label = Widget.Label({
        class_name: "scroller-trailmark",
        label: ''
    });
    const trail_label = Widget.Label({
        class_name: "scroller-trail",
        label: ''
    });
    const scroller = Widget.Box({
        class_name: "scroller",
        children: [
            mode_label,
            overview_label,
            trail_label,
            trailmark_label,
        ],
    })
    function event_decode(data) {
        const text = decoder.decode(data);
        console.log(text);
        console.log(text);
        console.log(text);
        console.log(text);
        if (text.startsWith("scroller>>mode,")) {
            const mode = text.substring(15).trim();
            if (mode == "row")
                mode_label.label = "-";
            else
                mode_label.label = "|";
        } else if (text.startsWith("scroller>>overview,")) {
            if (text.substring(19) == 1) {
                overview_label.label = "🐦";
            } else {
                overview_label.label = "";
            }
        } else if (text.startsWith("scroller>>trail,")) {
            const trail = text.substring(16).trim().split(",");
            const tnumber = trail[0].trim();
            if (tnumber == "-1") {
                trail_label.label = "";
            } else {
                const tsize = trail[1].trim();
                trail_label.label = tnumber + " (" + tsize + ")";
            }
        } else if (text.startsWith("scroller>>trailmark,")) {
            if (text.substring(20) == 1) {
                trailmark_label.label = "✅";
            } else {
                trailmark_label.label = "";
            }
        }
    }
    function connection() {
        const HIS = GLib.getenv('HYPRLAND_INSTANCE_SIGNATURE');
        const XDG_RUNTIME_DIR = GLib.getenv('XDG_RUNTIME_DIR') || '/';
        const sock = (pre) => `${pre}/hypr/${HIS}/.socket2.sock`;
        const path = GLib.file_test(sock(XDG_RUNTIME_DIR), GLib.FileTest.EXISTS)?
            sock(XDG_RUNTIME_DIR) : sock('/tmp');

        return new Gio.SocketClient()
            .connect(new Gio.UnixSocketAddress({ path }), null);
    }
    let listener = new Gio.DataInputStream({
        close_base_stream: true,
        base_stream: connection().get_input_stream(),
    });
    function watch_socket(sstream) {
        sstream.read_line_async(0, null, (stream, result) => {
            if (!stream)
                return console.error('Error reading Hyprland socket');

            const [line] = stream.read_line_finish(result);
            event_decode(line);
            watch_socket(stream);
        });
    }
    watch_socket(listener);
    return scroller;
}

const NormalOptionalWorkspaces = async () => {
    try {
        return (await import('./normal/workspaces_hyprland.js')).default();
    } catch {
        try {
            return (await import('./normal/workspaces_sway.js')).default();
        } catch {
            return null;
        }
    }
};

const time = Variable('', {
    poll: [
        1000, // update interval
        () => GLib.DateTime.new_now_local().format("%H:%M"),
    ],
})

const date = Variable('', {
    poll: [
        5000, // update interval
        () => GLib.DateTime.new_now_local().format("%a %b %d"),
    ],
})

const BarClock = () => Widget.Box({
    vpack: 'center',
    className: 'spacing-h-4',
    children: [
        Widget.Label({
            className: 'bar-date',
            label: date.bind(),
        }),
        Widget.Label({
            className: 'bar-date',
            label: time.bind(),
        }),
    ],
});

const BarGroup = ({ child }) => Widget.Box({
    className: 'bar-group-margin bar-sides',
    children: [
        Widget.Box({
            className: 'bar-group bar-group-standalone bar-group-pad-system',
            children: [child],
        }),
    ]
});

export const Bar = async (monitor = 0) => {
    const SideModule = (children) => Widget.Box({
        className: 'bar-sidemodule',
        children: children,
    });
    const normalBarContent = Widget.CenterBox({
        className: 'bar-bg',
        setup: (self) => {
            const styleContext = self.get_style_context();
            const minHeight = styleContext.get_property('min-height', Gtk.StateFlags.NORMAL);
            // execAsync(['bash', '-c', `hyprctl keyword monitor ,addreserved,${minHeight},0,0,0`]).catch(print);
        },
        startWidget: Widget.Box({
            children: [
                await NormalOptionalWorkspaces(),
                await WindowTitle(monitor),
            ],
        }),
        centerWidget: Widget.Box({
            className: 'spacing-h-4',
            children: [
                Scroller(),
            ]
        }),
        endWidget: Widget.Box({
            className: 'spacing-h-4',
            hpack: 'end',
            children: [
                Indicators(monitor, System(), BarClock()),
            ],
        }),
    });
    return Widget.Window({
        monitor,
        name: `bar${monitor}`,
        anchor: ['top', 'left', 'right'],
        exclusivity: 'exclusive',
        visible: true,
        child: Widget.Stack({
            homogeneous: false,
            transition: 'slide_up_down',
            transitionDuration: userOptions.animations.durationLarge,
            children: {
                'normal': normalBarContent,
                'focus': normalBarContent,
                'nothing': normalBarContent,
            },
            setup: (self) => self.hook(currentShellMode, (self) => {
                self.shown = currentShellMode.value[monitor];
            })
        }),
    });
}
