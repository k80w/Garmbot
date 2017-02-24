const debug = require("debug")("garmbot:module:moderation"),
	Discord = require("discord.js"),
	r = require("rethinkdb");

function ordinalSuffix(n) {
	var d = (n|0)%100;
	return d > 3 && d < 21 ? 'th' : ['th', 'st', 'nd', 'rd'][d%10] || 'th';
};

module.exports = function(garmbot) {
	garmbot.addGuildPreperation(async (conn, dbName) => {
		await garmbot.createTableIfNotExists(dbName, "infractions");
		await garmbot.createIndexIfNotExists(dbName, "infractions", "user");
	});
	garmbot.addCommand(["warn"], async function(message, args) {
		let embed = new Discord.RichEmbed();

		// TODO: Use the homebrew permission system when that's a thing
		if (message.member.hasPermission("MANAGE_MESSAGES")) {
			let user = message.mentions.users.first()

			if (user) {
				let warning = message.cleanContent.split(" ");
				warning.shift();
				warning = warning.join(" ");

				let conn = await garmbot.conn;
				let table = r.db(garmbot.getGuildDBName(message.guild)).table("infractions");

				await table.insert({
					user: user.id,
					warning: warning,
					timestamp: r.now(),
					by: message.author.id
				}).run(conn);

				let infractions = await table.getAll(user.id, {index: "user"}).run(conn);
				infractions = await infractions.toArray();

				await user.send("You have been warned on " + message.guild.name + " for `" + warning + "`. This is your " + infractions.length + ordinalSuffix(infractions.length) + " infraction.");

				embed
					.setTitle("User has been warned via DMs.")
					.setDescription("This is their " + infractions.length + ordinalSuffix(infractions.length) + " infraction.")
					.setColor(0x00ff00);
			} else {
				embed
					.setTitle("Please specify a user to warn.")
					.setColor(0xff0000);
			}
		} else {
			embed
				.setTitle("Sorry, you don't have access to that command.")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});
}