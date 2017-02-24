# Garmbot

# Running Garmbot yourself

## Prerequisites

 - [RethinkDB](https://www.rethinkdb.com/docs/install/) (>=2.3.5 recommended)
 - [Node.js](https://nodejs.org/en/download/current/) (>=7.2.0 required, >=7.6.0 recommended)

## Installing dependencies

In your operating system's shell (Command Prompt for Windows, Terminal for OSX) navigate to the root directory where you downloaded Garmbot's code. This directory should contain a `package.json` file and a `src` folder. Run the following command

```
$ npm install
```

This will download and install all of Garmbot's dependencies. It may take a while.

## Configuration

Create a file called `local.json` in the `config` folder with the following contents, adding your own bot token.

```json
{
	"discord": {
		"botToken": "PUT YOUR BOT TOKEN HERE"
	}
}
```

## Running

Navigate to the bot's root directory in your shell again and run the following

```
$ node --harmony src/run.js
```

### Running in debug mode

If you want to run in debug mode to get extra logging information, set the `DEBUG` environment variable to `garmbot,garmbot:*` before you run the bot.

**On Windows**

```
$ SET DEBUG=garmbot,garmbot:*
```

**On Linux/OSX**

```
$ export DEBUG=garmbot,garmbot:*
```