const debug = require("debug")("garmbot:module:tags"),
	Discord = require("discord.js"),
	r = require("rethinkdb");

module.exports = function(garmbot) {
	garmbot.addGuildPreperation(async (conn, dbName) => {
		await garmbot.createTableIfNotExists(dbName, "tags", {
			"primaryKey": "name"
		});
	});
	garmbot.addCommand(["tag", "t", "tags"], async function(message, args) {
		let conn = await garmbot.conn;

		let table = r.db(garmbot.getGuildDBName(message.guild)).table("tags");

		args = args.trim().split(" ");
		
		if (args[0].length === 0) {
			args = [];
		}

		if (args.length === 0) { // List tags
			debug("Listing tags");

			let cursor = await table.run(conn);
			let tags = await cursor.toArray();
			tags = await tags.map((tag) => {
				return "`" + tag.name + "`";
			});

			debug("Tag count: %s", tags.length);

			if (tags.length > 0) {
				let embed = new Discord.RichEmbed()
					.setTitle("Tags")
					.setDescription(tags.join(", "))
					.setColor(0x00ff00);
			
				return message.channel.sendEmbed(embed, message.author.toString());
			} else {
				let embed = new Discord.RichEmbed()
					.setTitle("No tags")
					.setDescription("There aren't any tags on this server yet.")
					.setColor(0xff0000);
			
				return message.channel.sendEmbed(embed, message.author.toString());
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
						author = undefined;
					}
				}
				
				let embed = new Discord.RichEmbed()
					.setTitle(tagName);
				if (!hideData) embed.setDescription(tag.data);
				if (url) {
					embed.setImage(url);
					embed.setURL(url);
				}
				if (author) embed.setFooter(author);
				embed.setColor(0x00ff00);

				return message.channel.sendEmbed(embed, message.author.toString());
			} else {
				let embed = new Discord.RichEmbed()
					.setTitle("Tag not found")
					.setDescription("The tag `" + tagName + "` was not found.")
					.setThumbnail("https://images.pexels.com/photos/14303/pexels-photo-14303.jpeg?fit=crop&w=128&h=128")
					.setColor(0xff0000);

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

			let embed = new Discord.RichEmbed()
				.setTitle("Doneski!")
				.setDescription("Successfully created the tag `" + tagName + "`")
				.setColor(0x00ff00);
			
			return message.channel.sendEmbed(embed, message.author.toString());
		}
	});
	garmbot.addCommand(["deltag"], async function(message, args) {
		let embed = new Discord.RichEmbed();
		if (message.member.hasPermission("MANAGE_MESSAGES")) {
			if (args.length === 1) {
				debug("Attempting to delete tag %s", args[0]);
				let conn = await garmbot.conn;
				let table = r.db(garmbot.getGuildDBName(message.guild)).table("tags");

				let tag = await table.get(args[0]).run(conn);

				if (tag) {
					debug("Tag exists; deleting.");
					await table.get(args[0]).delete().run(conn);
					embed
						.setTitle("Tag deleted!")
						.setColor(0x00ff00);
				} else {
					debug("But the tag doesn't exist.");
					embed
						.setTitle("That tag doesn't exist.")
						.setColor(0xff00000);
				}
			} else {
				embed
					.setTitle("Please specify exactly one tag to delete")
					.setColor(0xff0000);
			}
		} else {
			embed
				.setTitle("You don't have permissions to run that command.")
				.setColor(0xff0000);
		}

		return message.channel.sendEmbed(embed, message.author.toString());
	});
};