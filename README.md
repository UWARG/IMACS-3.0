# IMACS 3.0

IMACS 3.0 is forked from Falcon Ground Control Station (FGCS).

> Learn more on our [website](https://fgcs.projectfalcon.uk)!

![UI Screenshot](ui.webp)

---

## How to run

<details><summary>Windows - Installation</summary>

1. Go to [releases](https://github.com/Avis-Drone-Labs/FGCS/releases) and download the most recent versions `.exe` file
2. Run the downloaded file, you may have to click "more" then "run anyway" if windows defender blocks it
3. Once installed it should be accessible via the start menu as "FGCS"

</details>

<details><summary>Windows - Manually</summary>

### Prerequisites

1. Ensure npm is installed, to do so follow [this guide](https://kinsta.com/blog/how-to-install-node-js/). Note: node version must be >= v20.10.0
2. Ensure yarn is installed, to do so run `npm install --global yarn` or follow [this guide](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)
3. Install `python 3.11.9` (this can be found [here](https://www.python.org/downloads/release/python-3119/)) then create a virtual environment for it (see [Creating a virtual environment](#creating-a-virtual-environment) for help)

#### Creating a virtual environment

Create a new Python virtual environment using `python -m venv venv`. This can then be activated using `./venv/scripts/activate`.

> NOTE: To enter the virtual environment you will need to run `venv/Scripts/activate` on windows, to learn more please read: [how to make venv for linux and windows](https://www.geeksforgeeks.org/creating-python-virtual-environment-windows-linux/) or [what is a virtual environment?](https://docs.python.org/3/library/venv.html)


<details><summary>Running with bat file</summary>

1. If this is your first time running, please create a venv (see [Creating a virtual environment](#creating-a-virtual-environment)) and then run `./run.bat /path/to/venv update`
2. After this you can run `./run.bat /path/to/venv` (without the word update after)

</details>

<details><summary>Running independently</summary>

### Frontend

1. `cd gcs`
2. `yarn` (to install dependencies)
3. Create a `.env` file and add these two entries or rename `.env_sample` and populate the values:
   - `VITE_MAPTILER_API_KEY=` + Your maptiler API key (can be generated [on maptilers website](https://cloud.maptiler.com/account/keys))
   - `VITE_BACKEND_URL=http://127.0.0.1:4237` (if you want to change the port and host see: [Configuration > Changing Ports](#Configuration))
5. `yarn dev`

### Backend

1. `cd radio`
2. Make sure you're in a virtual environment (see [Creating a virtual environment](#creating-a-virtual-environment))
3. Install requirements `pip install -r requirements.txt`
4. `python app.py`

</details>

---

</details>

<details><summary>Mac/Linux</summary>

We currently don't have instructions or releases for mac or linux, we will in future releases. It does run on ubuntu and mac as members of the team use it, but we want to test the instructions before releasing them. However, you can still run both the frontend and backend individually by following the windows version with slight alterations to the commands.

</details>

---

## Development Info

<details><summary>Stack</summary>

- GUI
  - Electron + Vite + React (JavaScript)
- Backend
  - Flask + Pymavlink (Python)

</details>

<details><summary>Running tests</summary>

## Backend

For running Python tests, first make sure you're in the `radio` directory. By default the tests will attempt to connect to the simulator running within Docker. To run the tests simply run `pytest`. To use a physical device connected to your computer, you can use `pytest --fc -s` and a prompt will display to select the correct COM port for the device.

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

We are going to be using **python 3.11.x** so please install that on your computer from [Python's website](https://www.python.org/downloads/). Please try to use a virtual environment when programming, if you don't know how to do this please message me (Julian)! Name the folder either "env" or "venv" so its in the .gitignore as we don't want to be uploading that to github.

## Code Style

We will be using `black` as the code formatter and `flake8` + `pylint` for linting python code. Please look at the documentation found [here](https://black.readthedocs.io/). When pushing code we have an action to check if it is in the correct code style, if it is not in the correct style it will fail the run and you will need to fix it by running `python -m black .` for formatting and checking any linting issues reported by flake8 and pylint.

</details>

<details><summary>Pre-Commit</summary>

When cloning the repo for the first time, please install `pre-commit`. This can be done with a simple `pip install pre-commit` and then `pre-commit install`. Our pre-commit hooks will run every time you try to push something, if any of the checks fail then you will not be able to push that commit and receive an error message, often the files will be fixed but not staged, so make sure to re-stage and retry the with pushing commit.

</details>

<details><summary>Packaging</summary>

## Backend

From within the `radio` folder run `pyinstaller --paths .\venv\Lib\site-packages\ --add-data=".\venv\Lib\site-packages\pymavlink\message_definitions\:message_definitions" --add-data=".\venv\Lib\site-packages\pymavlink\:pymavlink" --hidden-import pymavlink --hidden-import engineio.async_drivers.threading .\app.py -n fgcs_backend`. This will create an exe and folder within the `dist/fgcs_backend/` folder.

On Mac:
From within the `radio` folder run
`pyinstaller --paths ./venv/lib/python3.11/site-packages/ --add-data="./venv/lib/python*/site-packages/pymavlink/message_definitions:message_definitions" --add-data="./venv/lib/python*/site-packages/pymavlink:pymavlink" --hidden-import pymavlink --hidden-import engineio.async_drivers.threading --windowed --name fgcs_backend ./app.py`.
This will create the `dist/fgcs_backend.app/` folder. 

## Frontend

After compiling the backend, place the contents of `radio/dist/fgcs_backend` into a folder in `gcs/extras`. Then from within the `gcs` folder run `yarn build`.

On Mac:
After compiling the backend, copy the `radio/dist/fgcs_backend.app` directory and move it to `gcs/extras`. Then from within the `gcs` folder run `yarn build`. Install from the .dmg file.

</details>

### Configuration

<details><summary>Changing Ports</summary>

We have an `.env` file located in `gcs/.env`. To change the host and port for the backend, please edit `VITE_BACKEND_URL`.

> Note: The default host and port is `http://127.0.0.1:4237`. 

</details>

---

## Need Help?

Feel free to ask questions in the [discussion area](https://github.com/Avis-Drone-Labs/FGCS/discussions).
