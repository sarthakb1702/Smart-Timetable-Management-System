
import docx
doc = docx.Document(r'C:\Users\Admin\Desktop\All websites\SArthak-tt\Smart-Timetable-Management-System\College-Timetable-System-Project-Doc.docx')
# print full table 1
table = doc.tables[1]
for j, row in enumerate(table.rows):
    cells = [c.text.strip() for c in row.cells]
    print(j, cells)

