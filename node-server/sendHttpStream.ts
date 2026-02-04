import axios from "axios";
import { Readable } from "stream";

async function streamWithAxios(text: string, url: string) {
  const characters = text.split("");
  let index = 0;

  const readable = new Readable({
    async read() {
      if (index >= characters.length) {
        this.push(null);
        return;
      }

      // Wait 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const char = characters[index++];
      console.log(`Sending: ${char}`);
      this.push(char); // Push the character into the stream buffer
    },
  });

  // 2. Send the POST request
  try {
    console.log("Starting Axios stream...");
    const response = await axios.post(url, readable, {
      responseType: "stream",
      headers: {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      },
    });

    response.data.on("data", (data: Buffer) => {
      console.log(data.toString());
    });

    response.data.on("end", () => {
      console.log("Server responded:");
    });
  } catch (error: any) {
    console.error("Axios streaming error:", error.message);
  }
}

streamWithAxios("HELLO", "http://localhost:3000/http/data");
