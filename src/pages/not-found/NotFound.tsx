import { A } from "@solidjs/router"
import Button from "../../shared/ui/Button"

export const NotFound = () => {
  return (
		<main class="flex flex-col items-center justify-center h-full gap-4 p-4 w-full">
			<h1>404 - Страница не найдена</h1>
			<p>Извините, запрашиваемая страница не существует.</p>
			<div>
				<A href='/'>
					<Button color="accent">Вернуться на главную страницу</Button>
				</A>
				<A href='/books'>
					<Button>Перейти к списку книг</Button>
				</A>
			</div>
		</main>
	);
}