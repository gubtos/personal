import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { MemberListItem } from "@/types";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#444444",
    marginBottom: 12,
  },
  table: {
    borderWidth: 0.5,
    borderColor: "#cccccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cccccc",
  },
  headerCell: {
    flex: 1,
    padding: 5,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  cell: {
    flex: 1,
    padding: 5,
    fontSize: 8,
  },
});

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function MembersPdfDocument({
  members,
  sortLabel,
}: {
  members: MemberListItem[];
  sortLabel: string;
}) {
  return (
    <Document title="Lista de Alunos" author="Avaliação">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Lista de Alunos</Text>
        <Text style={styles.subtitle}>
          {members.length} aluno(s) — ordenado por {sortLabel}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.headerCell}>Nome</Text>
            <Text style={styles.headerCell}>Data de Nascimento</Text>
            <Text style={styles.headerCell}>Próxima Avaliação</Text>
          </View>
          {members.map((member) => (
            <View key={member.id} style={styles.tableRow}>
              <Text style={styles.cell}>{member.name}</Text>
              <Text style={styles.cell}>{formatDate(member.birthday)}</Text>
              <Text style={styles.cell}>
                {formatDate(member.nextEvaluationDate)}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
