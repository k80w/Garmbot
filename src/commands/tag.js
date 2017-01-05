const debug = require("debug")("garmbot:tag");
const Discord = require("discord.js");
const r = require("rethinkdb");

module.exports = {
	"aliases": ["tag", "t", "tags"],
	"function": async function(garmbot, message, args) {
		let conn = await garmbot.conn;

		let table = r.db(garmbot.getGuildDBName(message.guild)).table("tags");

		args = args.trim().split(" ");
		
		if (args[0].length === 0) {
			args = [];
		}
		
		if (args.length === 0) { // List tags
			debug("Listing tags");

			let cursor = await table.getAll().run(conn);
			let tags = await cursor.toArray();

			if (tags.length > 1) {
				return message.reply(tags.join(", "));
			} else {
				return message.reply("There aren't any tags on this server yet. Make one with `!t NAME tag`");
			}
		} else if (args.length === 1) { // Return tag
			let tagName = args[0];

			debug("Returning tag %s", tagName);

			let tag = await table.get(tagName.toLowerCase()).run(conn);

			if (tag) {
				let url = (tag.data.match(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/i) || [])[0];
				let hideData = false;
				let author;

				if (url) {
					debug("Matched url in tag: %s", url);
					if (tag.data.trim().length === url.length) hideData = true;
				}

				if (tag.author) {
					author = await garmbot.fetchUser(tag.author);
					if (author) {
						author = author.username + "#" + author.discriminator;
					} else {
						delete author;
					}
				}
				
				let embed = new Discord.RichEmbed();
				embed.setTitle(tagName);
				if (!hideData) embed.setDescription(tag.data);
				if (url) {
					embed.setImage(url);
					embed.setURL(url)
				}
				if (author) embed.setFooter(author);
				embed.setColor(0x00ff00);

				return message.channel.sendEmbed(embed, message.author.toString());
			} else {
				let embed = new Discord.RichEmbed();
				embed.setTitle("Tag not found");
				embed.setDescription("The tag `" + tagName + "` was not found.");
				embed.setThumbnail("https://images.pexels.com/photos/14303/pexels-photo-14303.jpeg?fit=crop&w=128&h=128")
				embed.setColor(0xff0000);

				return message.channel.sendEmbed(embed, message.author.toString());
			}
		} else { // Make tag
			let tagName = args.shift().toLowerCase();
			let tagData = args.join(" ");

			debug("Creating tag %s", tagName);

			await table.insert({
				"name": tagName,
				"data": tagData,
				"author": message.author.id
			}, {
				"conflict": "replace"
			}).run(conn);

			await message.reply("Doneski!");
		}
	}
}