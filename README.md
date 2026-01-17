# IMACS 3.0

IMACS 3.0 is forked from Falcon Ground Control Station (FGCS).


The objective of this project is to develop a scalable and fully customizable ground control station universal to all operating systems, opening the door to creative freedom for unique features.

---

## How to run

<details><summary>Prerequisites</summary>

1. Ensure npm is installed, to do so follow [this guide](https://kinsta.com/blog/how-to-install-node-js/). Note: node version must be >= v20.10.0
2. Ensure yarn is installed, to do so run `npm install --global yarn` or follow [this guide](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)
3. Install `python 3.11.9` (this can be found [here](https://www.python.org/downloads/release/python-3119/)) then create a virtual environment for it (see [Creating a virtual environment](#creating-a-virtual-environment) for help)

</details>

<details><summary>Windows</summary>

1. Clone this repository into your device
2. Run `setup.bat` in project root
3. Run `build.bat` in project root
4. Run `run.bat` in project root

</details>

</details>

</details>

<details><summary>Mac/Linux</summary>

1. Clone this repository into your device
2. Run `source setup.sh` in project root
3. Run `source build.sh` in project root
4. Run `bash run.sh` in project root

</details>

<details><summary>Post Installation</summary>

Create a `.env` file and add these two entries or rename `.env_sample` and populate the values:
   - `VITE_MAPTILER_API_KEY=` + Your maptiler API key (can be generated [on maptilers website](https://cloud.maptiler.com/account/keys))
   - `VITE_BACKEND_URL=http://127.0.0.1:4237` (if you want to change the port and host see: [Configuration > Changing Ports](#Configuration))

</details>

---

## Development Info

<details><summary>Stack</summary>

- GUI
  - Electron + Vite + React (JavaScript)
- Backend
  - Flask + Pymavlink (Python)

</details>

<details><summary>SITL with Docker</summary>

To run the SITL simulator within Docker, first pull the docker image with `docker pull kushmakkapati/ardupilot_sitl`. Once pulled, you can start the container with `docker run -it --rm -p 5760:5760 kushmakkapati/ardupilot_sitl`. This will expose port 5760 for you to connect to over TCP on 127.0.0.1 (the connection string is `tcp:127.0.0.1:5760`). You can also open up port 5763 for running other scripts on the simulator whilst a GCS is connected.

By default the vehicle type will be ArduCopter, however you can tell the SITL to use a custom vehicle by providing it as a named argument at the end of the run command, e.g. `docker run -it --rm -p 5760:5760 kushmakkapati/ardupilot_sitl VEHICLE=ArduPlane`. You can also set the starting LAT, LON, ALT and DIR using the named arguments.

If you want to upload a custom parameter file or custom mission waypoint to the simulator then you must have a `custom_params.parm` or `mission.txt` file in your current working directory. These can then be uploaded to the simulator on run by specifying a bind mount with `-v .:/sitl_setup/custom` (note that the destination path must be `sitl_setup/custom`). E.g. `docker run -it --rm -p 5760:5760 -p 5763:5763 -v .:/sitl_setup/custom ardupilot_sitl VEHICLE=ArduPlane`.

Note: Steps to push an updated image to docker hub:

```plaintext
docker build . -t ardupilot_sitl
docker tag ardupilot_sitl:latest kushmakkapati/ardupilot_sitl:latest
docker push kushmakkapati/ardupilot_sitl:latest
```

</details>

<details><summary>Python</summary>

## Version

We are going to be using **python 3.11.x** so please install that on your computer from [Python's website](https://www.python.org/downloads/). Please try to use a virtual environment when programming. Name the folder either "env" or "venv" so its in the .gitignore as we don't want to be uploading that to github.

## Code Style

We will be using `black` as the code formatter and `flake8` + `pylint` for linting python code. Please look at the documentation found [here](https://black.readthedocs.io/). When pushing code we have an action to check if it is in the correct code style, if it is not in the correct style it will fail the run and you will need to fix it by running `python -m black .` for formatting and checking any linting issues reported by flake8 and pylint.

</details>

### Configuration

<details><summary>Changing Ports</summary>

We have an `.env` file located in `gcs/.env`. To change the host and port for the backend, please edit `VITE_BACKEND_URL`.

> Note: The default host and port is `http://127.0.0.1:4237`. 

</details>

---

## Need Help?

Feel free to ask questions in the [IMACS 3.0 discord channel](https://discordapp.com/channels/776618956638388305/1112859579106201682).
