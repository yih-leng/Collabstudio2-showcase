"use client";

import { Badge, Card, CardTitle, Tag } from "@collabrium/ui";
import { Star } from "@phosphor-icons/react";
import type { ProjectCardData } from "@/lib/types";
import { MediaFrame } from "./MediaFrame";
import styles from "./ProjectCard.module.css";

export function ProjectCard({
  project,
  headingLevel = 3,
}: {
  project: ProjectCardData;
  headingLevel?: 2 | 3 | 4;
}) {
  const clientNames = project.clients.map((c) => c.name).join(", ");
  return (
    <div className={styles.reveal}>
      <Card>
        <div className={styles.media}>
          <MediaFrame media={project.cover} aspect="16:9" mode="thumb" />
        </div>
        <div className={styles.meta}>
          {project.featured && (
            <Badge variant="selected" icon={Star}>
              Featured
            </Badge>
          )}
          {project.categories.map((c) => (
            <Tag key={c.id} variant="neutral">
              {c.name}
            </Tag>
          ))}
        </div>
        <CardTitle href={`/work/${project.slug}`} headingLevel={headingLevel}>
          {project.title}
        </CardTitle>
        <div className={styles.client}>
          {clientNames}
          {project.year ? ` · ${project.year}` : ""}
        </div>
      </Card>
    </div>
  );
}
