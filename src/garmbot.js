Promise = require("bluebird");

const config = require("config");
const debug = require("debug")("garmbot");
const Discord = require("discord.js");
const fs = Promise.promisifyAll(require("fs"));
const Path = require("path");
const r = require("rethinkdb");

class Garmbot extends Discord.Client {
	constructor() {
		super();
	}

	async start() {
		debug("Connecting to database");
		this.conn = r.connect({
			"host": config.get("rethink.host"),
			"port": config.get("rethink.port"),
			"db": config.get("rethink.dbPrefix") + "global",
			"user": config.get("rethink.user"),
			"password": config.get("rethink.password"),
			"timeout": config.get("rethink.timeout")
		});

		this.createDatabaseIfNotExists(config.get("rethink.dbPrefix") + "global");

		// Reload commands
		this.reloadCommands();

		// Bind events
		debug("Binding events");
		this.on("ready", this.ready);
		this.on("guildCreate", this.updateGuildInfo);
		this.on("message", this.handleMessage);

		// Log in
		debug("Logging in");
		this.login(config.get("discord.botToken"));
	}

	async ready() {
		this.guilds.forEach((guild) => {
			this.updateGuildInfo(guild);
		});
	}

	async handleMessage(message) {
		let conn = await this.conn;

		if (message.author.bot) return; // Dont respond to bots
		if (message.system) return; // Discard system messages
		if (!message.guild) return message.reply("DMs are a work in progress :sunglasses:");
		
		let prefix;
		if (message.guild) {
			prefix = await r.db(this.getGuildDBName(message.guild)).table("config").get("commandPrefix").run(conn);
		}

		if (!prefix) {
			prefix = config.get("commandPrefix");
		}

		if (message.content.startsWith(prefix)) {
			debug("Received command in message %s", message.id);
			let content = message.content.substr(prefix.length);
			let commandName = (content.match(/^[a-zA-Z0-9\.]+/)[0] || "").toLowerCase();
			let args = content.substr(prefix.length + commandName.length);
			
			let commands = await this.commands;
			
			for (let i = 0; i < commands.length; i++) {
				if (commands[i].aliases.indexOf(commandName) > -1) {
					debug("Executing command %s", commandName);
					return commands[i].function(this, message, args).catch((err) => {
						console.error(err);
						let embed = new Discord.RichEmbed();
						embed.setTitle("I've been hecked!");
						embed.setDescription("I'm not sure what I did, but I hit an error trying to do that! I'm s-sorry ;-;");
						embed.setThumbnail("https://images.pexels.com/photos/14303/pexels-photo-14303.jpeg?fit=crop&w=128&h=128")
						embed.setColor(0xff0000);

						return message.channel.sendEmbed(embed, message.author.toString());
					});
				}
			}

			let embed = new Discord.RichEmbed();
			embed.setTitle("Command not found");
			embed.setDescription("The command `" + commandName + "` was not found.\nTry using `" + prefix + "help` for more information.");
			embed.setThumbnail("https://images.pexels.com/photos/14303/pexels-photo-14303.jpeg?fit=crop&w=128&h=128")
			embed.setColor(0xff0000);

			return message.channel.sendEmbed(embed, message.author.toString());
		}
	}

	reloadCommands() {
		debug("Reloading commands");

		this.commands = new Promise((resolve, reject) => {
			let commandPath = Path.join(__dirname, "commands");

			return fs.readdirAsync(commandPath).map((file) => {
				if (file.match(/\.js$/)) {
					debug("Loading %s", file);
					return require(Path.join(commandPath, file));
				}
				return null;
			}).then((commands) => {
				return resolve(commands);
			}).catch(reject);
		});
	}

	/**
	 * Returns the database name of the specified guild or guild id
	 * @param {Guild|String} guild
	 * @return {String} dbName
	 */
	getGuildDBName(guild) {
		if (guild.id) {
			return config.get("rethink.dbPrefix") + guild.id;
		} else if (typeof(guild) === "string") {
			return config.get("rethink.dbPrefix") + guild;
		} else {
			throw new Error("Unknown guild resolvable %s", guild);
		}
	}

	/**
	 * Updates the guild's info in the database
	 * @param {Guild} guild
	 */
	async updateGuildInfo(guild) {
		let conn = await this.conn;
		debug("Updating guild info for %s", guild.id);

		let dbName = this.getGuildDBName(guild);

		await this.createDatabaseIfNotExists(dbName);
		await this.createTableIfNotExists(dbName, "config", {
			"primaryKey": "key"
		});
		await this.createTableIfNotExists(dbName, "permissions");
		await this.createTableIfNotExists(dbName, "mediaQueue");
		await this.createTableIfNotExists(dbName, "tags", {
			"primaryKey": "name"
		});
	}

	/**
	 * Ensures the given database exists
	 * @param {String} dbName
	 */
	async createDatabaseIfNotExists(dbName) {
		let conn = await this.conn;
		debug("Ensuring database %s exists", dbName);

		return await r.dbList().contains(dbName).do((exists) => {
			return r.branch(exists, {dbs_created: 0}, r.dbCreate(dbName));
		}).run(conn);
	}

	/**
	 * Ensures the given table exists
	 * Does not modify options of existing tables
	 * @param {String} dbName
	 * @param {String} tableName
	 * @param {Object} options Options to be passed to r.tableCreate
	 */
	async createTableIfNotExists(dbName, tableName, options) {
		options = options || {};
		let conn = await this.conn;
		debug("Ensuring table %s.%s exists", dbName, tableName);

		return await r.db(dbName).tableList().contains(tableName).do((exists) => {
			return r.branch(exists, {tables_created: 0}, r.db(dbName).tableCreate(tableName, options));
		}).run(conn);
	}
}

module.exports = Garmbot;