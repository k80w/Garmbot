//todo: subscriptions == colors?
const Discord = require("discord.js"),
	r = require("rethinkdb");

const tableName = "subscriptionRoles";
const emptyDescription = "N/A";

module.exports = function(garmbot) {
	garmbot.addGuildPreperation(async (conn, dbName) => {
		await garmbot.createTableIfNotExists(dbName, tableName);
	});

	garmbot.addCommand(["rank", "sub", "subscribe"], async function(message) {
		let conn = await garmbot.conn;
		let table = r.db(garmbot.getGuildDBName(message.guild)).table(tableName);
		let subIDs = await table.run(conn);

		let roleIdsToAdd = message.mentions.roles.map(role => role.id);

		let availableRoles = await subIDs.toArray();

		let embed = new Discord.RichEmbed()
			.setTitle("No nubscribble specified :(")
			.setDescription("Please mention the subscribbles you'd like to subscribble to!")
			.setColor(0xff0000);

		if (roleIdsToAdd.length == 0) {
			return message.channel.sendEmbed(embed, message.author.toString());
		}

		let verifiedRoles = [];

		let success = await roleIdsToAdd.every(async (id) => {
			let availableRoleToSub = availableRoles.find(role => role.id == id);
			if (availableRoleToSub == null) {
				return false;
			}

			if (availableRoleToSub.id == id) {
				let availableRoleToGuild = message.guild.roles.find(role => role.id == id);
				verifiedRoles.push(availableRoleToGuild);
				await message.member.addRole(availableRoleToGuild);
				return true;
			}
		});

		if (verifiedRoles.length == 0) {
			embed
				.setTitle("No valid subscribbles were found in your request :(")
				.setDescription("Make sure you mentioned roles that are available from !ranks!")
				.setColor(0xff0000);
		} else if (verifiedRoles.length != roleIdsToAdd.length) {
			embed
				.setTitle("Some subscribbles were not found found in your request :|")
				.setDescription(`But we added the ones that matched: ${verifiedRoles.map(role => role.name).join(", ")}`)
				.setColor(0xffff00);
		} else if (success) {
			embed
				.setTitle("Subscribbled successfully :)")
				.setDescription(`You'll now receive pings when these ranks are mentioned: ${verifiedRoles.map(role => role.name).join(", ")}!`)
				.setColor(0x00ff00);
		} else {
			embed
				.setTitle("Uh-oh")
				.setDescription("Something weird went wrong, try again!")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});

	garmbot.addCommand(["unsub", "unsubscribe"], async function(message, args) {
		let conn = await garmbot.conn;
		let table = r.db(garmbot.getGuildDBName(message.guild)).table(tableName);
		let subIDs = await table.run(conn);

		let aSubscription = args.toLowerCase().trim();

		let roles = await subIDs.toArray();

		let embed = new Discord.RichEmbed();

		if (aSubscription.length > 0) {
			let role;

			for (let i = 0; i < roles.length; i++) {
				role = message.guild.roles.get(roles[i].id);

				if (role && role.name.toLowerCase() === aSubscription) {
					break;
				} else {
					role = undefined;
				}
			}

			if (role) {
				await message.member.removeRole(role);

				embed
					.setTitle(`Unsubscribbled from  ${role.name}.`)
					.setDescription("You'll no longer receive pings when this rank is mentioned.")
					.setColor(0x00ff00);
			} else {
				embed
					.setTitle("Subscribble not found :(")
					.setDescription("Make sure you spelled it right")
					.setColor(0xff0000);
			}
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});

	garmbot.addCommand(["ranks", "subscriptions", "subs"], async function(message) {
		let conn = await garmbot.conn;
		let subscriptionsAndDescriptions = await (await r.db(garmbot.getGuildDBName(message.guild)).table(tableName).run(conn)).toArray().map((v, i) => {
			let role = message.guild.roles.get(v.id);
			return `${i + 1}: ${role.name} -- ${v.description}`;
		});

		let embed = new Discord.RichEmbed()
			.setTitle("Available subscribbles")
			.setDescription(subscriptionsAndDescriptions.join("\n"));

		if (subscriptionsAndDescriptions.length === 0) {
			embed
				.setTitle("No available subscribbles :(")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});

	garmbot.addCommand(["addrank", "addranks", "addsub", "addsubs"], async function(message) {
		// TODO: Use the homebrew permission system when that's a thing
		if (!message.member.hasPermission("ADMINISTRATOR")) {
			return;
		}

		let conn = await garmbot.conn;
		let table = r.db(garmbot.getGuildDBName(message.guild)).table(tableName);

		let success = message.mentions.roles.every(async (role) => {
			let res = await table.insert({
				id: role.id,
				description: emptyDescription
			}).run(conn);

			return res.errors == 0;
		});

		let embed = new Discord.RichEmbed();

		if (success) {
			embed
				.setTitle("Subscribbleable roles set!")
				.setDescription("All of the specified roles are now subscriblleable ranks!")
				.setColor(0x00ff00);
		} else {
			embed
				.setTitle("Uh-oh")
				.setDescription("Something weird went wrong, try again!")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});

	garmbot.addCommand(["rmrank", "rmranks", "rmsub", "rmsubs"], async function(message) {
		// TODO: Use the homebrew permission system when that's a thing
		if (!message.member.hasPermission("ADMINISTRATOR")) {
			return;
		}

		let conn = await garmbot.conn;
		let table = r.db(garmbot.getGuildDBName(message.guild)).table(tableName);

		let success = message.mentions.roles.every(async (role) => {
			let res = await table.get(role.id).delete().run(conn);
			return res.errors == 0;
		});

		let embed = new Discord.RichEmbed();

		if (success) {
			embed
				.setTitle("Subscribbleable roles removed.")
				.setDescription("All of the specified roles are no longer subscriblleable.")
				.setColor(0x00ff00);
		} else {
			embed
				.setTitle("Uh-oh")
				.setDescription("Something weird went wrong, try again!")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});

	/**
	 * describerank can also be used to add new roles and describe them from
	 * the start, but only one at a time
	 */
	garmbot.addCommand(["describerank", "describesub"], async function(message) {
		// TODO: Use the homebrew permission system when that's a thing
		if (!message.member.hasPermission("ADMINISTRATOR")) {
			return;
		}

		if (message.mentions.roles.size != 1) {
			// one at a time, parsing--
			return;
		}

		let conn = await garmbot.conn;
		let roleName;
		let table = r.db(garmbot.getGuildDBName(message.guild)).table(tableName);

		let success = message.mentions.roles.every(async (role) => {
			roleName = role.name;
			let lengthOfId = `${role.id}>`.length;
			let positionInMessage = message.content.indexOf(role.id);
			let description = message.content.substring(positionInMessage + lengthOfId).trim();

			let res = await table.insert({
				id: role.id,
				description: description || emptyDescription
			}, {
				conflict: "replace"
			}).run(conn);

			return res.errors == 0;
		});

		let embed = new Discord.RichEmbed();

		if (success) {
			embed
				.setTitle("Subscribbleable role described!")
				.setDescription(`A description for ${roleName} has successfully been set!`)
				.setColor(0x00ff00);
		} else {
			embed
				.setTitle("Uh-oh")
				.setDescription("Something weird went wrong, try again!")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});
};