import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver, UseFormProps } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { ZodType } from "zod";

export function useZodForm<TValues extends FieldValues, TContext = unknown>(
	props: Omit<UseFormProps<TValues, TContext>, "resolver"> & {
		schema: ZodType<TValues>;
	},
) {
	const { schema, ...formProps } = props;

	const form = useForm<TValues, TContext>({
		...formProps,
		resolver: zodResolver(schema as never, undefined) as Resolver<
			TValues,
			TContext
		>,
	});

	return form;
}
