import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { modulesApi } from '@services/endpoints';

export default function DepartmentsBranches() {
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string; city?: string }>>([]);
  const [permissions, setPermissions] = useState<Array<{ code: string; role: string; description?: string }>>([]);
  const [deptName, setDeptName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setDepartments(await modulesApi.departments());
      setBranches(await modulesApi.branches());
      setPermissions(await modulesApi.permissions());
    } catch {
      setError('Failed to load org data');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Departments & branches</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">Departments</Typography>
      {departments.map((d) => (
        <Typography key={d.id}>{d.name}</Typography>
      ))}
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="New department" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
        <Button
          variant="contained"
          onClick={async () => {
            await modulesApi.createDepartment({ name: deptName });
            setDeptName('');
            await load();
          }}
        >
          Add
        </Button>
      </Stack>
      <Typography variant="h6">Branches</Typography>
      {branches.map((b) => (
        <Typography key={b.id}>
          {b.name} · {b.city}
        </Typography>
      ))}
      <Stack direction="row" spacing={1}>
        <TextField size="small" label="New branch" value={branchName} onChange={(e) => setBranchName(e.target.value)} />
        <Button
          variant="contained"
          onClick={async () => {
            await modulesApi.createBranch({ name: branchName, city: 'Mumbai' });
            setBranchName('');
            await load();
          }}
        >
          Add
        </Button>
      </Stack>
      <Typography variant="h6">Roles & permissions</Typography>
      {permissions.map((p) => (
        <Typography key={`${p.role}-${p.code}`} variant="body2">
          [{p.role}] {p.code} — {p.description}
        </Typography>
      ))}
    </Stack>
  );
}
