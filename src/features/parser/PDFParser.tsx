import { useListen } from "@/shared/hooks/useListen";
import { PDFParse } from "pdf-parse";

export const PDFParser = () => {
  useListen<{ data: string }>('pdf-parse', async event => {
			const parser = new PDFParse({ data: atob(event.payload.data) });

			const result = await parser.getText();
			console.log(result.text);
		});

  return <></>;
};
