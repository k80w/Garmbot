Promise = require("bluebird");

const config = require("config");
const debug = require("debug")("garmbot");
const Discord = require("discord.js");
const fs = Promise.promisifyAll(require("fs"));
const Path = require("path");
const r = require("rethinkdb");
const uuid = require("node-uuid");

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

		let globalDbName = config.get("rethink.dbPrefix") + "global";
		this.createDatabaseIfNotExists(globalDbName);
		//this.createTableIfNotExists(globalDbName, "defaultPermissions")

		this.commands = [];
		this.guildPreperationFunctions = [
			async (conn, dbName) => {
				await this.createDatabaseIfNotExists(dbName)
			},
			async (conn, dbName) => {
				await this.createTableIfNotExists(dbName, "config", {
					"primaryKey": "key"
				});
			},
			async (conn, dbName) => {
				await this.createTableIfNotExists(dbName, "permissions");
			}
		];

		this.loadPlugins();

		// Bind events
		debug("Binding events");
		this.on("ready", this.ready);
		this.on("guildCreate", this.updateGuildInfo);
		this.on("message", this.handleMessage);

		// Log in
		debug("Logging in");
		this.login(config.get("discord.botToken"));
	}

	async errorHandler(err, id) {
		debug("Encountered error");
		if (this.readyAt) {
			debug("I'm connected, I'll try to report it to someone");
			let user = await this.fetchUser(config.get("reportErrorsToUser"));
			if (user) {
				debug("Reporting error to %s", user.id);
				return user.sendCode("", "Error ID: " + id + "\n\n" + err.stack);
			}
		}
		debug("Can't report it to anyone");
		console.error(err);		
	}

	async ready() {
		this.updateAllGuildInfo();
	}

	async updateAllGuildInfo() {
		return this.guilds.forEach((guild) => {
			return this.updateGuildInfo(guild);
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

					return commands[i].function(message, args).catch((err) => {
						let id = uuid.v4();
						this.errorHandler(err, id);

						let embed = new Discord.RichEmbed()
							.setTitle("I've been hecked!")
							.setDescription("I'm not sure what I did, but I hit an error trying to do that! I'm s-sorry ;-;")
							.addField("Please report this error", "Go to http://github.com/dnaf/Garmbot/issues and report this issue, along with the following code\n\n`" + id + "`")
							.setThumbnail("https://i.imgur.com/Q0qnyNy.png")
							.setColor(0xff0000);
						return message.channel.sendEmbed(embed, message.author.toString());
					}).then(() => {
							if(message.deletable) message.delete(2000)
						});
				}
			}


			let embed = new Discord.RichEmbed()
				.setTitle("Command not found")
				.setDescription("The command `" + commandName + "` was not found.\nTry using `" + prefix + "help` for more information.")
				.setThumbnail("https://i.imgur.com/Nxr2CNV.png")
				.setColor(0x800080);
			
			return message.channel.sendEmbed(embed, message.author.toString()).then(() => {if (message.deletable) message.delete(2000)});
		}
	}

	loadPlugins() {
		debug("Loading plugins");

		let pluginPath = Path.join(process.cwd(), "plugins");

		this.plugins = fs.readdirAsync(pluginPath).map((file) => {
			if (!file.startsWith(".") && !file.toLowerCase().endsWith(".md")) {
				return [require(Path.join(pluginPath, file)), file];
			}
			return [];
		}).each(([plugin, pluginName]) => {
			if (typeof(plugin) === "function") {
				debug("Loading plugin %s", pluginName);
				plugin(this);
			}
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

		for (let i = 0; i < this.guildPreperationFunctions.length; i++) {
			await this.guildPreperationFunctions[i](conn, dbName);
		}
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

	async createIndexIfNotExists(dbName, tableName, indexName, options) {
		options = options || {};
		let conn = await this.conn;
		debug("Ensuring index %s.%s.%s exists", dbName, tableName, indexName);

		return await r.db(dbName).table(tableName).indexList().contains(indexName).do((exists) => {
			return r.branch(exists, {created: 0}, r.db(dbName).table(tableName).indexCreate(indexName, options));
		}).run(conn);
	}

	async addGuildPreperation(func) {
		this.guildPreperationFunctions.push(func);

		this.updateAllGuildInfo();
	}

	addCommand(aliases, func) {
		debug("Adding command %s", aliases[0]);
		this.commands.push({
			"aliases": aliases,
			"function": func
		});
	}

	async getUserPermission(user, guild, permission) {
		await this.conn;

		//let dbName = this.getGuildDBName(guild);

		//return r.db(dbName).table("permissions")
	}

	/**
	 * Gets the number of messages in a channel in the specified period
	 * @param {TextChannel} channel
	 * @param {Number} period The amount of time in seconds to check
	 * @returns {Number} messageCount
	 */
	async getRecentMessagesInChannel(channel, period) {
		debug("Getting recent messages in channel %s", channel.id);
		let cutoff = Number(new Date()) - period * 1000;
		let earliestMessage = null;
		let earliestTimestamp;
		let messageCount = 0;

		while (!earliestTimestamp || earliestTimestamp >= cutoff) {
			let messages = await channel.fetchMessages({
				limit: 50,
				before: (earliestMessage || {}).id
			});

			if (messages.size === 0) {
				debug("Hit beginning of channel; breaking");
				break;
			}

			for(let message of messages.values()) {
				if (!earliestTimestamp || message.createdTimestamp < earliestTimestamp) {
					earliestMessage = message;
					earliestTimestamp = message.createdTimestamp;
				}
				if (message.createdTimestamp >= cutoff) {
					messageCount++;
				}
			}
		}

		return messageCount;
	}
}

module.exports = Garmbot;
