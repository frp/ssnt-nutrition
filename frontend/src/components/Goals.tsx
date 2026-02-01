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

import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { BackendBaseUrl } from "@/BackendUrlContext";
import { NUTRIENTS, useNutrientCounterMutation } from "@/common";
import { DotCountInput } from "./DotCountInput";

export default function Goals() {
  const { t } = useTranslation();
  const baseUrl = useContext(BackendBaseUrl);

  const query = useQuery({
    queryKey: ["goals"],
    queryFn: () => fetch(`${baseUrl}/goals`).then((res) => res.json()),
  });

  const [mutationsInProgress, mutation] = useNutrientCounterMutation(
    `${baseUrl}/goals/portions`,
    "inc",
    ["goals"],
  );

  if (query.isPending) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  if (query.isError) {
    return <div className="error">{t("common.error")}</div>;
  }

  // The gidden buttons are in place to ensure consistency of height with the Portions view.
  if (query.data) {
    return (
      <>
        <div className="header-nav">
          <button
            type="button"
            className="nav-button"
            style={{ visibility: "hidden" }}
          >
            {"<"}
          </button>
          <span>{t("Goals.title")}</span>
          <button
            type="button"
            className="nav-button"
            style={{ visibility: "hidden" }}
          >
            {">"}
          </button>
        </div>
        <div className="nutrients-list">
          {NUTRIENTS.map((n) => (
            <DotCountInput
              name={n}
              key={n}
              count={query.data[n] ?? 0}
              inProgress={mutationsInProgress[n] ?? 0}
              onIncrease={() => mutation.mutate({ name: n, command: "inc" })}
              onDecrease={() => mutation.mutate({ name: n, command: "dec" })}
            />
          ))}
        </div>
      </>
    );
  }

  return undefined;
}
