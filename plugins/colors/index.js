const debug = require("debug")("garmbot:colors"),
	Discord = require("discord.js"),
	r = require("rethinkdb");

module.exports = function(garmbot) {
	garmbot.addGuildPreperation((conn, dbName) => {
		garmbot.createTableIfNotExists(dbName, "colorRoles");
	});
	garmbot.addCommand(["color"], async function(message, args) {
		let conn = await garmbot.conn;
		let table = r.db(garmbot.getGuildDBName(message.guild)).table("colorRoles");
		let colorIDs = await table.run(conn);

		let color = args.toLowerCase().trim();

		let roles = await colorIDs.toArray();

		let embed = new Discord.RichEmbed();

		if (color.length > 0) {
			let role;

			for (let i = 0; i < roles.length; i++) {
				role = message.guild.roles.get(roles[i].id);

				if (role && role.name.toLowerCase() === color) {
					break;
				} else {
					role = undefined;
				}
			}

			if (role) {
				let ids = roles.map((role) => {
					return role.id;
				});
				debug("Clearing color roles %s from member %s", ids, message.member);
				await message.member.removeRoles(ids);
				debug("Giving member %s role %s", message.member, role);
				await message.member.addRole(role);

				embed
					.setTitle("Color given!")
					.setDescription("You look stunning ^-^")
					.setColor(role.hexColor);
			} else {
				embed
					.setTitle("Color not found")
					.setDescription("Make sure you spelled it right")
					.setColor(0xff0000);
			}
		} else {
			let ids = roles.map((role) => {
				return role.id;
			});
			debug("Clearing color roles %s from member %s", ids, message.member);
			await message.member.removeRoles(ids);

			embed
				.setTitle("Color cleared")
				.setDescription("You're free!")
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});
	garmbot.addCommand(["addcolor", "addcolors"], async function(message, args) {
		// TODO: Use the homebrew permission system when that's a thing
		if (message.member.hasPermission("ADMINISTRATOR")) {
			let conn = await garmbot.conn;
			let table = r.db(garmbot.getGuildDBName(message.guild)).table("colorRoles");

			let success = message.mentions.roles.every(async (role) => {
				debug("Adding color %s to color roles", role.id);
				let res = await table.insert({
					id: role.id
				}, {
					conflict: "replace"
				}).run(conn);

				return res.errors == 0;
			});

			let embed = new Discord.RichEmbed();

			if (success) {
				embed
					.setTitle("Color roles set!")
					.setDescription("All of the specified roles were set as colors!")
					.setColor(0x00ff00);
			} else {
				embed = new Discord.RichEmbed()
					.setTitle("Uh-oh")
					.setDescription("Something weird went wrong, try again!")
					.setColor(0xff0000);
			}

			return message.channel.sendEmbed(embed, message.author.toString());
		}
	});
}