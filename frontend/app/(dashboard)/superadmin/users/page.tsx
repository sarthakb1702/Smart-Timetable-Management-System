'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Building,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Save,
} from 'lucide-react'
import { createClient } from '../../../../lib/supabase/client'
import { UserRole, getRoleDisplayName } from '../../../../lib/role-guards'
import { Badge } from '../../../../components/ui/Badge'
import { StatCard } from '../../../../components/ui/StatCard'
import { Modal } from '../../../../components/ui/Modal'

interface UserItem {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id?: string | null
  department_name?: string
  phone?: string | null
  is_active: boolean
}

const SAMPLE_USERS: UserItem[] = [
  {
    id: 'u-1',
    email: 'superadmin@smartcollege.edu',
    full_name: 'Dr. Rajesh Verma',
    role: 'superadmin',
    department_id: null,
    department_name: 'Institutional Administration',
    phone: '+91 98230 11223',
    is_active: true,
  },
  {
    id: 'u-2',
    email: 'coordinator@smartcollege.edu',
    full_name: 'Prof. Ananya Sen',
    role: 'college_coordinator',
    department_id: null,
    department_name: 'Central Academic Cell',
    phone: '+91 98230 44556',
    is_active: true,
  },
  {
    id: 'u-3',
    email: 'hod.cs@smartcollege.edu',
    full_name: 'Dr. Ramesh Deshmukh',
    role: 'hod',
    department_id: 'dept-cs-1',
    department_name: 'Computer Science & Engineering',
    phone: '+91 98230 77889',
    is_active: true,
  },
  {
    id: 'u-4',
    email: 'tt.cs@smartcollege.edu',
    full_name: 'Prof. Sneha Kulkarni',
    role: 'dept_coordinator',
    department_id: 'dept-cs-1',
    department_name: 'Computer Science & Engineering',
    phone: '+91 98230 99001',
    is_active: true,
  },
  {
    id: 'u-5',
    email: 'sharma.faculty@smartcollege.edu',
    full_name: 'Prof. Amit Sharma',
    role: 'faculty',
    department_id: 'dept-cs-1',
    department_name: 'Computer Science & Engineering',
    phone: '+91 98230 22334',
    is_active: true,
  },
  {
    id: 'u-6',
    email: 'patel.faculty@smartcollege.edu',
    full_name: 'Dr. Varun Patel',
    role: 'faculty',
    department_id: 'dept-cs-1',
    department_name: 'Computer Science & Engineering',
    phone: '+91 98230 55667',
    is_active: true,
  },
  {
    id: 'u-7',
    email: 'aarav.student@smartcollege.edu',
    full_name: 'Aarav Mehta',
    role: 'student',
    department_id: 'dept-cs-1',
    department_name: 'Computer Science & Engineering',
    phone: '+91 98230 88990',
    is_active: true,
  },
]

const ALL_ROLES: UserRole[] = [
  'superadmin',
  'college_coordinator',
  'hod',
  'dept_coordinator',
  'faculty',
  'student',
]

const ROLE_BADGE_VARIANTS: Record<UserRole, any> = {
  superadmin: 'purple',
  college_coordinator: 'primary',
  hod: 'amber',
  dept_coordinator: 'info',
  faculty: 'success',
  student: 'secondary',
}

export default function SuperadminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>(SAMPLE_USERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)

  // Form State
  const [formData, setFormData] = useState<{
    email: string
    full_name: string
    role: UserRole
    department_name: string
    phone: string
  }>({
    email: '',
    full_name: '',
    role: 'faculty',
    department_name: 'Computer Science & Engineering',
    phone: '',
  })

  // Load from Supabase if available
  useEffect(() => {
    async function fetchUsers() {
      try {
        const supabase = createClient()
        const { data, error } = await (supabase as any)
          .from('users')
          .select('*, departments(name)')
        if (data && !error && data.length > 0) {
          setUsers(
            data.map((u: any) => ({
              id: u.id,
              email: u.email,
              full_name: u.full_name,
              role: u.role as UserRole,
              department_id: u.department_id,
              department_name: u.departments?.name || 'College Wide',
              phone: u.phone,
              is_active: u.is_active ?? true,
            }))
          )
        }
      } catch (err) {
        // Fallback to sample users
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department_name && u.department_name.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      full_name: '',
      role: 'faculty',
      department_name: 'Computer Science & Engineering',
      phone: '',
    })
    setIsModalOpen(true)
  }

  const openEditModal = (user: UserItem) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department_name: user.department_name || '',
      phone: user.phone || '',
    })
    setIsModalOpen(true)
  }

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                full_name: formData.full_name,
                email: formData.email,
                role: formData.role,
                department_name: formData.department_name,
                phone: formData.phone,
              }
            : u
        )
      )
    } else {
      const newUser: UserItem = {
        id: `u-${Date.now()}`,
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        department_name: formData.department_name,
        phone: formData.phone,
        is_active: true,
      }
      setUsers((prev) => [newUser, ...prev])
    }
    setIsModalOpen(false)
  }

  const toggleActiveStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u))
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Institutional User Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage accounts, assign roles, departments, and enforce access permissions.
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add User Account
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Accounts"
          value={users.length}
          subtitle="Registered institutional users"
          icon={Users}
          iconColor="text-indigo-400"
        />
        <StatCard
          title="Faculty Members"
          value={users.filter((u) => u.role === 'faculty').length}
          subtitle="Teaching schedule holders"
          icon={Shield}
          iconColor="text-emerald-400"
        />
        <StatCard
          title="Coordinators & HODs"
          value={users.filter((u) => ['hod', 'dept_coordinator', 'college_coordinator'].includes(u.role)).length}
          subtitle="Schedule administrators"
          icon={Building}
          iconColor="text-amber-400"
        />
        <StatCard
          title="Active Students"
          value={users.filter((u) => u.role === 'student').length}
          subtitle="Enrolled learners"
          icon={Users}
          iconColor="text-sky-400"
        />
      </div>

      {/* Filters & Search */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {getRoleDisplayName(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">User Information</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {user.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white tracking-tight">
                            {user.full_name}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </span>
                            {user.phone && (
                              <span className="hidden md:flex items-center gap-1 text-slate-500">
                                • <Phone className="w-3 h-3" /> {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={ROLE_BADGE_VARIANTS[user.role]} dot>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-300">
                      {user.department_name || 'Institutional'}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActiveStatus(user.id)}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                          user.is_active
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60'
                            : 'bg-rose-950/70 text-rose-300 border-rose-500/30 hover:bg-rose-900/60'
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit User Account' : 'Register New User Account'}
        subtitle="Manage access roles and departmental assignments"
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Dr. Rajesh Verma"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Institutional Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. user@smartcollege.edu"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Assigned Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {getRoleDisplayName(r)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Department
            </label>
            <input
              type="text"
              value={formData.department_name}
              onChange={(e) => setFormData({ ...formData, department_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Computer Science & Engineering"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Contact Phone (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+91 98230 11223"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {editingUser ? 'Save Updates' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
