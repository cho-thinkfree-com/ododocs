import re

# Read the file
with open('src/pages/workspace/ImportantDocumentsPage.tsx', 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Replace the table header width and add folder column
content = re.sub(
    r'(<TableCell width=)"40%"(>\s+<TableSortLabel\s+active=\{orderBy === \'name\'\})',
    r'\g<1>"35%"\g<2>',
    content
)

# Add folder column header after name column
content = re.sub(
    r'(</TableSortLabel>\s+</TableCell>)\s+(<TableCell width=)"15%"(>\s+<TableSortLabel\s+active=\{orderBy === \'size\'\})',
    r'\1\n                            <TableCell width="15%">{strings.workspace.folderColumn}</TableCell>\n                            \g<2>"12%"\g<3>',
    content
)

# Adjust Last Modified column width
content = re.sub(
    r'(<TableCell width=)"20%"(>\s+<TableSortLabel\s+active=\{orderBy === \'updatedAt\'\})',
    r'\g<1>"18%"\g<2>',
    content
)

# Add folder column data in table body - after the name cell and before the size cell
# Find the pattern where we have </Box></TableCell> followed by <TableCell> with size data
pattern = r'(</Box>\s+</TableCell>)\s+(<TableCell>\s+\{isFolder \? \(\s+<Typography variant="body2" color="text\.secondary">-</Typography>\s+\) : \(\s+<Typography variant="body2" color="text\.secondary">\s+\{formatBytes\(\(item as DocumentSummary\)\.contentSize\)\}\s+</Typography>\s+\)\}\s+</TableCell>)'

replacement = r'''\1
                                <TableCell>
                                    {isFolder ? (
                                        <Typography variant="body2" color="text.secondary">-</Typography>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            {(item as DocumentSummary).folderName || strings.workspace.rootFolder}
                                        </Typography>
                                    )}
                                </TableCell>
                                \2'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('src/pages/workspace/ImportantDocumentsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated ImportantDocumentsPage.tsx")
