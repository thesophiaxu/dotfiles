#!/usr/bin/env python

DISPLAY_CONFIG_NORMAL = """
monitor=eDP-1,preferred,auto,1.6
""".strip()

DISPLAY_CONFIG_DISABLE_LAPTOP_MONITOR = """
monitor=eDP-1,disable
""".strip()

import os

def toggle_display_config():
    config_path = os.path.expanduser("~/.config/hypr/monitors.conf")
    with open(config_path, "r") as f:
        current_config = f.read().strip()
        
    print(current_config)

    if current_config == DISPLAY_CONFIG_NORMAL:
        new_config = DISPLAY_CONFIG_DISABLE_LAPTOP_MONITOR
    else:
        new_config = DISPLAY_CONFIG_NORMAL

    with open(config_path, "w") as f:
        f.write(new_config)

if __name__ == "__main__":
    toggle_display_config()
