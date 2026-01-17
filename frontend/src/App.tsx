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

import "./App.css";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

const queryClient = new QueryClient();

function Nutrient({
  date,
  count,
  name,
}: {
  count: number;
  name: string;
  date: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      date,
      name,
      direction,
    }: {
      date: string;
      name: string;
      direction: string;
    }) =>
      fetch(`http://localhost:3000/nutrients/${date}/${name}/${direction}`, {
        method: "POST",
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <p>
      <button onClick={() => mutation.mutate({ date, name, direction: "dec" })}>
        -
      </button>
      {name}: {count}{" "}
      <button onClick={() => mutation.mutate({ date, name, direction: "inc" })}>
        +
      </button>
    </p>
  );
}

function Nutrients() {
  const date = new Date().toISOString().split("T")[0];

  const nutrients = ["protein", "carbs", "vegetables", "fats"];

  const query = useQuery({
    queryKey: ["nutrients"],
    queryFn: () =>
      fetch(`http://localhost:3000/nutrients/${date}`).then((res) =>
        res.json(),
      ),
  });

  if (query.isPending) {
    return <>Pending...</>;
  }

  if (query.isError) {
    return <>Error!</>;
  }

  if (query.data) {
    return nutrients.map((n) => (
      <Nutrient date={date} name={n} count={query.data[n] ?? 0} />
    ));
  }

  return <></>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Nutrients />
    </QueryClientProvider>
  );
}

export default App;
