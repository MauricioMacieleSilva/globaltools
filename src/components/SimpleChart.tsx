import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  data: ChartData[];
  type?: 'pie' | 'bar';
  height?: number;
}

const COLORS = ['hsl(212 100% 47%)', 'hsl(212 100% 35%)', 'hsl(215 16% 54%)', 'hsl(0 84% 60%)', 'hsl(142 76% 36%)'];

export function SimpleChart({ data, type = 'pie', height = 200 }: SimpleChartProps) {
  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value) => [`${value} kg`, 'Peso']} />
        <Bar dataKey="value" fill="hsl(212 100% 47%)" />
      </BarChart>
    </ResponsiveContainer>
  );
}