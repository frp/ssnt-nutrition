// Copyright 2026 Roman F
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import * as z from "zod/mini";

export const NUTRIENTS = ["protein", "carbs", "vegetables", "fats"];

export const PortionsOfNutrients = z.record(z.string(), z.number());
export type PortionsOfNutrients = z.infer<typeof PortionsOfNutrients>;

type MutationInputs = {
  name: string;
  command: string;
};

/**
 * A hook that provides a mutation for updating nutrient counts with optimistic tracking.
 *
 * It tracks "in-progress" mutations locally to allow the UI to show pending changes
 * immediately. When the mutation succeeds, it updates the React Query cache.
 *
 * @param urlPrefix - The base URL for the mutation. Requests are sent to `${urlPrefix}/{nutrient}/{command}`.
 * @param incCommand - The command name that signifies an increment. Any other command is treated as a decrement.
 * @param queryKey - The React Query key to update in the cache upon success.
 * @returns A tuple containing:
 *          - `mutationsInProgress`: An object tracking the net change of currently active mutations.
 *          - `mutation`: The React Query mutation result object.
 */
export function useNutrientCounterMutation(
  urlPrefix: string,
  incCommand: string,
  queryKey: string[],
): [
  PortionsOfNutrients,
  UseMutationResult<Response, Error, MutationInputs, void>,
] {
  // { 'protein': 1 } would mean that pending mutations involve 1 portion of protein
  const [mutationsInProgress, setMutationsInProgress] = useState(
    {} as PortionsOfNutrients,
  );

  const queryClient = useQueryClient();

  return [
    mutationsInProgress,
    useMutation({
      mutationFn: ({ name, command }: MutationInputs) =>
        fetch(`${urlPrefix}/${name}/${command}`, {
          method: "POST",
        }),
      onMutate: ({ name, command }) => {
        setMutationsInProgress((m) => {
          return {
            ...m,
            [name]: (m[name] ?? 0) + (command === incCommand ? 1 : -1),
          };
        });
      },
      onSuccess: (_, { name, command }) => {
        queryClient.setQueryData(queryKey, (data: PortionsOfNutrients) => {
          return {
            ...data,
            [name]: (data[name] ?? 0) + (command === incCommand ? 1 : -1),
          };
        });
        setMutationsInProgress((m) => {
          // To remove from "in progress", add the opposite of the mutation direction.
          return {
            ...m,
            [name]: (m[name] ?? 0) + (command === incCommand ? -1 : 1),
          };
        });
      },
      onError: (_, { name, command }) => {
        toast.error(
          `Error communicating with the backend. Please check your Internet connection.`,
        );
        setMutationsInProgress((m) => {
          // To remove from "in progress", add the opposite of the mutation direction.
          return {
            ...m,
            [name]: (m[name] ?? 0) + (command === incCommand ? -1 : 1),
          };
        });
      },
    }),
  ];
}
