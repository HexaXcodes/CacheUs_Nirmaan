"""Read the ESP8266 flash ID without uploading the flasher stub or erasing flash."""
import os
import sys

tools_dir = os.path.join(os.environ['LOCALAPPDATA'], 'Arduino15', 'packages',
                         'esp8266', 'hardware', 'esp8266', '3.1.2', 'tools')
sys.path.insert(0, os.path.join(tools_dir, 'pyserial'))
sys.path.insert(0, os.path.join(tools_dir, 'esptool'))
import esptool

if __name__ == '__main__':
    esptool.main(['--chip', 'esp8266', '--port', 'COM3', '--baud', '57600',
                  '--no-stub', 'flash_id'])
