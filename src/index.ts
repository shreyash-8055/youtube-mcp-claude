
import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "youtube-mcp-claude",
    version: "1.0.0"
  });

  // Tool 1: Connection test
  server.registerTool(
    "hello",
    {
      description: "Test whether the YouTube MCP server is working",
      inputSchema: {
        name: z.string().optional()
      }
    },
    async ({ name }) => ({
      content: [{
        type: "text",
        text: `YouTube MCP is working! Hello ${name ?? "User"}.`
      }]
    })
  );

  // Tool 2: Get YouTube video information
  server.registerTool(
    "get_video_details",
    {
      description: "Get the title, creator and description of a YouTube video",
      inputSchema: {
        url: z.string().url().describe("YouTube video URL")
      }
    },
    async ({ url }) => {
      try {
        const videoUrl = new URL(url);
        let videoId = "";

        if (videoUrl.hostname.includes("youtu.be")) {
          videoId = videoUrl.pathname.slice(1);
        } else {
          videoId = videoUrl.searchParams.get("v") ?? "";
        }

        if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          throw new Error("Invalid YouTube video URL");
        }

        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        );

        if (!response.ok) {
          throw new Error("Could not retrieve video information");
        }

        const data = await response.json() as {
          title: string;
          author_name: string;
          author_url: string;
          thumbnail_url: string;
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              video_id: videoId,
              title: data.title,
              creator: data.author_name,
              creator_url: data.author_url,
              thumbnail: data.thumbnail_url,
              video_url: `https://www.youtube.com/watch?v=${videoId}`
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          isError: true,
          content: [{
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error"
          }]
        };
      }
    }
  );

  return server;
}

const handler = createMcpHandler(createServer);

export default {
  fetch(request: Request, env: unknown, ctx: ExecutionContext) {
    return handler(request, env, ctx);
  }
};
