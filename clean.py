import re

file_path = 'src/app/(management)/students/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const getPlanDisplay = \(member: CourtMember\) => \{.*?};\n', '', content, flags=re.DOTALL)
content = content.replace(' mockCourtMembers, mockCourtPlans, Student, CourtMember', ' Student')
content = content.replace("import EditCourtMemberModal from '@/components/court/EditCourtMemberModal'\n", '')
content = content.replace("import AddMemberModal from '@/components/court/AddMemberModal'\n", '')

state_vars = [
    r'\s*const \[memberSegment, setMemberSegment\].*\n',
    r'\s*const \[courtFilter, setCourtFilter\].*\n',
    r'\s*const \[courtTab, setCourtTab\].*\n',
    r'\s*const \[courtSearchQuery, setCourtSearchQuery\].*\n',
    r'\s*const \[showAddCourtModal, setShowAddCourtModal\].*\n',
    r'\s*const \[logMenuId, setLogMenuId\].*\n',
    r'\s*const \[editingCourtMember, setEditingCourtMember\].*\n',
    r'\s*const \[loggedInMemberId, setLoggedInMemberId\].*\n',
    r'\s*const logInTimerRef = useRef.*\n',
]
for var in state_vars:
    content = re.sub(var, '', content)

content = re.sub(r'\s*useEffect\(\(\) => \{\n\s*return \(\) => \{ if \(logInTimerRef\.current\) clearTimeout\(logInTimerRef\.current\); \};\n\s*\}, \[\]\);\n', '', content)
content = re.sub(r'\s*const handleUndoLogIn = \(member.*?refresh\(\);\n\s*};\n', '', content, flags=re.DOTALL)
content = re.sub(r'\s*const handleLogIn = \(member.*?refresh\(\); // forceUpdate\n\s*};\n', '', content, flags=re.DOTALL)
content = re.sub(r'\s*const handleCourtAction = \(memberId.*?setOpenActionMenuId\(null\)\n\s*}\n', '', content, flags=re.DOTALL)
content = re.sub(r'\s*const displayedCourtMembers = mockCourtMembers\.filter\(m => \{.*?\n\s*\}\)\n', '', content, flags=re.DOTALL)

content = re.sub(r'\{mockSettings\.courtMembershipEnabled && \(\s*<div className="flex bg-so-surface.*?</div>\s*\)\}\s*', '', content, flags=re.DOTALL)

pattern = r'\{memberSegment === \'court\' \? \(.*?\) : \(\s*<div className="space-y-0'
content = re.sub(pattern, '<div className="space-y-0', content, flags=re.DOTALL)

content = re.sub(r'\s*\)\}\s*</div>\s*\)\s*\}\s*$', '\n      </div>\n    </div>\n  )\n}\n', content)

with open('src/app/(management)/students/page_clean.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
