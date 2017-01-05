const Discord = require("discord.js");

module.exports = {
	"aliases": ["reloadcommands", "reloadcmds", "rldcmds"],
	"function": async function(garmbot, message, args) {
		await garmbot.reloadCommands();

		let embed = new Discord.RichEmbed();
		embed.setTitle("Commands reloaded!");
		embed.setDescription("All the commands have been reloaded!");
		embed.setColor(0x00ff00);

		return message.channel.sendEmbed(embed, message.author.toString());
	}
}