import { client } from "../index.js";
import { getPrediction } from "../models/index.js";
import { embed } from "../models/loaders/utils.js";
import { Query, getDeadSurvivors } from "./query.js";

export const GRAPHQL_ENDPOINT =
  "https://survivor-mainnet-indexer.realms.world/graphql";
export const POLL_INTERVAL = 3000; // Poll every 5000 ms (5 seconds)

const seenAdventurers = new Set();

export const pollGraphQL = ({
  llmStatement,
  query,
}: {
  llmStatement: string;
  query: Query;
}) => {
  fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // body: JSON.stringify(getDeadSurvivors),
    body: JSON.stringify(query),
  })
    .then((response) => response.json())
    .then((data) => {
      const newAdventurers = data.data.adventurers.filter(
        (adventurer: any) => !seenAdventurers.has(adventurer.id)
      );

      // Process new adventurers here
      newAdventurers.forEach((adventurer: any) => {
        console.log("New adventurer:", adventurer);

        client.channels
          .fetch(process.env.DISCORD_SURVIVOR_CHANNEL || "")
          .then((channel) => {
            if (channel?.isTextBased()) {
              getPrediction(llmStatement, JSON.stringify(adventurer)).then(
                (prediction) => {
                  const exampleEmbed = {
                    color: 0x00ff3c,
                    title:
                      adventurer.name +
                      (adventurer.health === 0
                        ? " has died"
                        : " has entered the arena"),
                    url: "https://survivor.realms.world/",
                    description: prediction,
                    timestamp: new Date().toISOString(),
                    footer: {
                      text: "dedicated to the fallen",
                    },
                  };

                  channel.send({ embeds: [exampleEmbed] });
                }
              );
            }
          });

        seenAdventurers.add(adventurer.id);
      });

      if (newAdventurers.length === 0) {
        console.log("No new adventurers found at this time.");
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      // Handle error here
    });
};
