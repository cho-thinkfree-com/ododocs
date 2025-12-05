/**
 * Custom table commands that copy cell attributes (e.g., backgroundColor)
 * when adding rows/columns.
 */

import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { EditorState, Transaction } from '@tiptap/pm/state'
import {
    TableMap,
    selectedRect as pmSelectedRect,
    isInTable as pmIsInTable
} from 'prosemirror-tables'

// Types
interface TableRect {
    left: number
    right: number
    top: number
    bottom: number
    tableStart: number
    map: TableMap
    table: ProseMirrorNode
}

interface CellAttrs {
    colspan: number
    rowspan: number
    colwidth: number[] | null
    backgroundColor?: string | null
}

// Helper: Get table node types from schema
function tableNodeTypes(schema: any) {
    let result = schema.cached.tableNodeTypes
    if (!result) {
        result = schema.cached.tableNodeTypes = {}
        for (const name in schema.nodes) {
            const type = schema.nodes[name]
            const role = type.spec.tableRole
            if (role) result[role] = type
        }
    }
    return result
}

// Wrapper for prosemirror-tables' isInTable
function isInTable(state: EditorState): boolean {
    return pmIsInTable(state)
}

// Wrapper for prosemirror-tables' selectedRect with error handling
function selectedRect(state: EditorState): TableRect | null {
    try {
        return pmSelectedRect(state) as unknown as TableRect
    } catch {
        return null
    }
}

// Helper: Add colspan to cell attrs
function addColSpan(attrs: CellAttrs, pos: number, n = 1): CellAttrs {
    const result = { ...attrs, colspan: attrs.colspan + n }
    if (result.colwidth) {
        result.colwidth = result.colwidth.slice()
        for (let i = 0; i < n; i++) {
            result.colwidth.splice(pos, 0, 0)
        }
    }
    return result
}

/**
 * Add a row at targetRow position, copying attributes from sourceRow
 */
function addRowWithAttrsAt(
    tr: Transaction,
    rect: TableRect,
    targetRow: number,
    sourceRow: number
): Transaction {
    const { map, tableStart, table } = rect
    const schema = table.type.schema
    const types = tableNodeTypes(schema)

    // Calculate row insertion position
    let rowPos = tableStart
    for (let i = 0; i < targetRow; i++) {
        rowPos += table.child(i).nodeSize
    }

    // Build new cells
    const cells: ProseMirrorNode[] = []
    const seen = new Set<number>()

    for (let col = 0; col < map.width; col++) {
        const sourceIndex = sourceRow * map.width + col
        const targetIndex = targetRow * map.width + col
        const sourceCellPos = map.map[sourceIndex]

        // Skip if already processed (merged cell)
        if (seen.has(sourceCellPos)) continue
        seen.add(sourceCellPos)

        const sourceCell = table.nodeAt(sourceCellPos)
        if (!sourceCell) continue

        const sourceAttrs = sourceCell.attrs as CellAttrs

        // Check if we need to extend an existing cell's rowspan
        // (when a cell from above spans into this row)
        if (targetRow > 0 && targetRow < map.height &&
            map.map[targetIndex] === map.map[targetIndex - map.width]) {
            const existingPos = map.map[targetIndex]
            const existingCell = table.nodeAt(existingPos)
            if (existingCell) {
                tr.setNodeMarkup(tableStart + existingPos, null, {
                    ...existingCell.attrs,
                    rowspan: (existingCell.attrs as CellAttrs).rowspan + 1
                })
                col += sourceAttrs.colspan - 1
                continue
            }
        }

        // Create new cell with copied attributes (but empty content)
        const cellType = sourceCell.type
        const newCell = cellType.create(
            {
                colspan: 1,
                rowspan: 1,
                colwidth: null,
                backgroundColor: sourceAttrs.backgroundColor || null
            },
            types.cell.contentMatch.defaultType?.create() || null
        )
        cells.push(newCell)
    }

    // Insert the new row
    if (cells.length > 0) {
        tr.insert(rowPos, types.row.create(null, cells))
    }

    return tr
}

/**
 * Add a column at targetCol position, copying attributes from sourceCol
 */
function addColumnWithAttrsAt(
    tr: Transaction,
    rect: TableRect,
    targetCol: number,
    sourceCol: number
): Transaction {
    const { map, tableStart, table } = rect
    const schema = table.type.schema
    const types = tableNodeTypes(schema)

    for (let row = 0; row < map.height; row++) {
        const sourceIndex = row * map.width + sourceCol
        const targetIndex = row * map.width + targetCol
        const sourceCellPos = map.map[sourceIndex]

        // Check if we need to extend colspan (cell spans into this column)
        if (targetCol > 0 && targetCol < map.width &&
            map.map[targetIndex] === map.map[targetIndex - 1]) {
            const existingPos = map.map[targetIndex]
            const existingCell = table.nodeAt(existingPos)
            if (existingCell) {
                const attrs = existingCell.attrs as CellAttrs
                tr.setNodeMarkup(
                    tr.mapping.map(tableStart + existingPos),
                    null,
                    addColSpan(attrs, targetCol - map.colCount(existingPos))
                )
                row += attrs.rowspan - 1
                continue
            }
        }

        // Create new cell with copied attributes
        const sourceCell = table.nodeAt(sourceCellPos)
        if (!sourceCell) continue

        const sourceAttrs = sourceCell.attrs as CellAttrs
        const cellType = sourceCell.type

        const newCell = cellType.create(
            {
                colspan: 1,
                rowspan: 1,
                colwidth: null,
                backgroundColor: sourceAttrs.backgroundColor || null
            },
            types.cell.contentMatch.defaultType?.create() || null
        )

        const insertPos = map.positionAt(row, targetCol, table)
        tr.insert(tr.mapping.map(tableStart + insertPos), newCell)
    }

    return tr
}

// Export commands for TipTap
export function addRowBeforeWithAttrs(
    state: EditorState,
    dispatch?: (tr: Transaction) => void
): boolean {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    if (!rect) return false

    if (dispatch) {
        dispatch(addRowWithAttrsAt(state.tr, rect, rect.top, rect.top))
    }
    return true
}

export function addRowAfterWithAttrs(
    state: EditorState,
    dispatch?: (tr: Transaction) => void
): boolean {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    if (!rect) return false

    if (dispatch) {
        // Copy from the last row in selection (rect.bottom - 1)
        dispatch(addRowWithAttrsAt(state.tr, rect, rect.bottom, rect.bottom - 1))
    }
    return true
}

export function addColumnBeforeWithAttrs(
    state: EditorState,
    dispatch?: (tr: Transaction) => void
): boolean {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    if (!rect) return false

    if (dispatch) {
        dispatch(addColumnWithAttrsAt(state.tr, rect, rect.left, rect.left))
    }
    return true
}

export function addColumnAfterWithAttrs(
    state: EditorState,
    dispatch?: (tr: Transaction) => void
): boolean {
    if (!isInTable(state)) return false
    const rect = selectedRect(state)
    if (!rect) return false

    if (dispatch) {
        // Copy from the last column in selection (rect.right - 1)
        dispatch(addColumnWithAttrsAt(state.tr, rect, rect.right, rect.right - 1))
    }
    return true
}
