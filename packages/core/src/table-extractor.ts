import type { DistilledElement, DistilledNode } from './cleaner';

interface GridCell {
  text: string;
  isHeader: boolean;
  originRow: number;
  originCol: number;
  rowspan: number;
  colspan: number;
}

/**
 * Converts a `DistilledElement` `<table>` (including complex multi-row `<thead>` with
 * `colspan` + `rowspan` merged cells, `<tbody>`, `<tfoot>`, and `<caption>`) into a
 * 100% column-aligned GitHub-Flavored Markdown (GFM) table using a 2D Virtual Grid Matrix.
 */
export function renderTableToMarkdown(
  tableEl: DistilledElement,
  renderInlineChildren: (nodes: DistilledNode[]) => string,
): string {
  let captionText = '';
  const headerRows: DistilledElement[] = [];
  const bodyRows: Array<{ row: DistilledElement; omittedComment?: string }> = [];

  const collectRowsFromSection = (
    section: DistilledElement,
    target: 'head' | 'body',
  ): void => {
    for (const child of section.children) {
      if (child.kind === 'comment') {
        bodyRows.push({
          row: { kind: 'element', tag: 'tr', classes: [], attrs: {}, children: [] },
          omittedComment: child.text.trim(),
        });
        continue;
      }
      if (child.kind !== 'element') continue;
      if (child.tag === 'tr') {
        if (target === 'head') headerRows.push(child);
        else bodyRows.push({ row: child });
      }
    }
  };

  for (const child of tableEl.children) {
    if (child.kind === 'comment') {
      bodyRows.push({
        row: { kind: 'element', tag: 'tr', classes: [], attrs: {}, children: [] },
        omittedComment: child.text.trim(),
      });
      continue;
    }
    if (child.kind !== 'element') continue;
    if (child.tag === 'caption') {
      captionText = renderInlineChildren(child.children).trim();
    } else if (child.tag === 'thead') {
      collectRowsFromSection(child, 'head');
    } else if (child.tag === 'tbody' || child.tag === 'tfoot') {
      collectRowsFromSection(child, 'body');
    } else if (child.tag === 'tr') {
      // Direct `<tr>` children without explicit `<thead>`/`<tbody>`
      const cells = child.children.filter(
        (c): c is DistilledElement => c.kind === 'element' && (c.tag === 'th' || c.tag === 'td'),
      );
      const allTh = cells.length > 0 && cells.every((c) => c.tag === 'th');
      if (allTh && bodyRows.length === 0) {
        headerRows.push(child);
      } else {
        bodyRows.push({ row: child });
      }
    }
  }

  // Promote first body row to header if no explicit `<thead>` or `<th>` row exists
  if (headerRows.length === 0 && bodyRows.length > 0 && !bodyRows[0].omittedComment) {
    const first = bodyRows.shift()!;
    headerRows.push(first.row);
  }

  if (headerRows.length === 0 && bodyRows.length === 0) {
    return captionText ? `*${captionText}*` : '';
  }

  // Build 2D virtual grid for header rows separately from body rows so multi-level
  // `<thead>` rows collapse into a single hierarchical GFM header row!
  const headerGrid = populateVirtualGrid(headerRows, renderInlineChildren);
  const bodyRealRows = bodyRows.filter((b) => !b.omittedComment).map((b) => b.row);
  const bodyGrid = populateVirtualGrid(bodyRealRows, renderInlineChildren);

  const totalCols = Math.max(headerGrid.colCount, bodyGrid.colCount, 1);

  // Synthesize flattened GFM header labels per column (e.g. `Q1 2026 / Revenue`)
  const finalHeaders: string[] = [];
  for (let col = 0; col < totalCols; col++) {
    const parts: string[] = [];
    for (let r = 0; r < headerGrid.matrix.length; r++) {
      const cell = headerGrid.matrix[r]?.[col];
      if (cell && cell.text) {
        if (parts[parts.length - 1] !== cell.text) {
          parts.push(cell.text);
        }
      }
    }
    finalHeaders.push(escapePipe(parts.join(' / ') || `Col ${col + 1}`));
  }

  const lines: string[] = [];
  if (captionText) {
    lines.push(`**${captionText}**`, '');
  }

  lines.push(`| ${finalHeaders.join(' | ')} |`);
  lines.push(`| ${finalHeaders.map(() => '---').join(' | ')} |`);

  let realBodyIdx = 0;
  for (const entry of bodyRows) {
    if (entry.omittedComment) {
      const msg = escapePipe(`*(${entry.omittedComment})*`);
      const rowCells = Array.from({ length: totalCols }, (_, idx) => (idx === 0 ? msg : ''));
      lines.push(`| ${rowCells.join(' | ')} |`);
      continue;
    }

    const rowCellsData = bodyGrid.matrix[realBodyIdx] ?? [];
    realBodyIdx++;

    const renderedRow: string[] = [];
    for (let col = 0; col < totalCols; col++) {
      const cell = rowCellsData[col];
      if (!cell) {
        renderedRow.push('');
        continue;
      }
      if (cell.originRow === realBodyIdx - 1 && cell.originCol === col) {
        renderedRow.push(escapePipe(cell.text));
      } else if (cell.originCol === col && cell.originRow < realBodyIdx - 1) {
        // Vertical `rowspan` continuation in body: repeat short group label so every row is self-contained
        renderedRow.push(cell.text.length <= 48 ? escapePipe(cell.text) : '');
      } else {
        // Horizontal `colspan` continuation in body: empty cell preserves column alignment
        renderedRow.push('');
      }
    }
    lines.push(`| ${renderedRow.join(' | ')} |`);
  }

  return lines.join('\n');
}

function populateVirtualGrid(
  rows: DistilledElement[],
  renderInlineChildren: (nodes: DistilledNode[]) => string,
): { matrix: Array<Array<GridCell | undefined>>; colCount: number } {
  const matrix: Array<Array<GridCell | undefined>> = [];
  let maxCols = 0;

  const ensureRow = (r: number): Array<GridCell | undefined> => {
    while (matrix.length <= r) {
      matrix.push([]);
    }
    return matrix[r];
  };

  for (let r = 0; r < rows.length; r++) {
    const tr = rows[r];
    const rowArr = ensureRow(r);
    let colCursor = 0;

    const cells = tr.children.filter(
      (c): c is DistilledElement => c.kind === 'element' && (c.tag === 'th' || c.tag === 'td'),
    );

    for (const cellEl of cells) {
      while (rowArr[colCursor] !== undefined) {
        colCursor++;
      }

      const colspan = Math.max(1, Number.parseInt(cellEl.attrs['colspan'] ?? '1', 10) || 1);
      const rowspan = Math.max(1, Number.parseInt(cellEl.attrs['rowspan'] ?? '1', 10) || 1);
      const rawText = renderInlineChildren(cellEl.children)
        .replace(/\r?\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const cellObj: GridCell = {
        text: rawText,
        isHeader: cellEl.tag === 'th',
        originRow: r,
        originCol: colCursor,
        rowspan,
        colspan,
      };

      for (let dr = 0; dr < rowspan; dr++) {
        const targetRow = ensureRow(r + dr);
        for (let dc = 0; dc < colspan; dc++) {
          targetRow[colCursor + dc] = cellObj;
        }
      }

      colCursor += colspan;
      if (colCursor > maxCols) maxCols = colCursor;
    }

    if (rowArr.length > maxCols) {
      maxCols = rowArr.length;
    }
  }

  return { matrix, colCount: maxCols };
}

function escapePipe(text: string): string {
  return text.replace(/\|/g, '\\|');
}
