import { Toaster } from "@/shared/ui/Toaster";
import { Breadcrumb } from "./Breadcrumble";

export const Layout = (props: any) => {
  return (
		<>
			<Breadcrumb class='px-4' />
			{props.children}
			<Toaster />
		</>
	);
};