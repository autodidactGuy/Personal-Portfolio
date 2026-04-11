import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { FieldValues, Resolver, UseFormProps } from "react-hook-form";
import type { ZodTypeAny } from "zod/v3";

export function useZodForm<TValues extends FieldValues, TContext = unknown>(
  props: Omit<UseFormProps<TValues, TContext>, "resolver"> & {
    schema: ZodTypeAny;
  },
) {
  const { schema, ...formProps } = props;
  const form = useForm<TValues, TContext>({
    ...formProps,
    resolver: zodResolver(schema, undefined) as Resolver<TValues, TContext>,
  });

  return form;
}
