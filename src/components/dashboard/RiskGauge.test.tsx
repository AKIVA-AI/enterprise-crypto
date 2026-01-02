import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskGauge } from './RiskGauge';

describe('RiskGauge Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { container } = render(<RiskGauge value={50} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<RiskGauge value={50} label="Risk Level" />);
      expect(screen.getByText('Risk Level')).toBeInTheDocument();
    });

    it('should render with custom max value', () => {
      const { container } = render(<RiskGauge value={50} max={200} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('should display the correct value', () => {
      render(<RiskGauge value={75} label="Test" />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should display percentage when value is less than max', () => {
      render(<RiskGauge value={50} max={100} label="Test" />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should handle zero value', () => {
      render(<RiskGauge value={0} label="Test" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle max value', () => {
      render(<RiskGauge value={100} max={100} label="Test" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use success color for low risk (< 50%)', () => {
      const { container } = render(<RiskGauge value={30} max={100} />);
      const gauge = container.querySelector('.text-success');
      expect(gauge).toBeInTheDocument();
    });

    it('should use warning color for medium risk (50-75%)', () => {
      const { container } = render(<RiskGauge value={60} max={100} />);
      const gauge = container.querySelector('.text-warning');
      expect(gauge).toBeInTheDocument();
    });

    it('should use destructive color for high risk (> 75%)', () => {
      const { container } = render(<RiskGauge value={80} max={100} />);
      const gauge = container.querySelector('.text-destructive');
      expect(gauge).toBeInTheDocument();
    });

    it('should use destructive color for 100% risk', () => {
      const { container } = render(<RiskGauge value={100} max={100} />);
      const gauge = container.querySelector('.text-destructive');
      expect(gauge).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle value greater than max', () => {
      const { container } = render(<RiskGauge value={150} max={100} />);
      expect(container.firstChild).toBeInTheDocument();
      // Should still render, but percentage will be > 100%
    });

    it('should handle negative values gracefully', () => {
      const { container } = render(<RiskGauge value={-10} max={100} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      const { container } = render(<RiskGauge value={1000000} max={1000000} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle decimal values', () => {
      render(<RiskGauge value={45.5} max={100} label="Test" />);
      expect(screen.getByText('45.5')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<RiskGauge value={50} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should maintain base classes with custom className', () => {
      const { container } = render(<RiskGauge value={50} className="custom-class" />);
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain('flex');
      expect(element.className).toContain('flex-col');
      expect(element.className).toContain('items-center');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible with label', () => {
      render(<RiskGauge value={50} label="Risk Level" />);
      const label = screen.getByText('Risk Level');
      expect(label).toBeInTheDocument();
    });

    it('should render without label', () => {
      const { container } = render(<RiskGauge value={50} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Percentage Calculation', () => {
    it('should calculate 0% correctly', () => {
      render(<RiskGauge value={0} max={100} label="Test" />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should calculate 50% correctly', () => {
      render(<RiskGauge value={50} max={100} label="Test" />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('should calculate 100% correctly', () => {
      render(<RiskGauge value={100} max={100} label="Test" />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should calculate percentage with custom max', () => {
      render(<RiskGauge value={100} max={200} label="Test" />);
      expect(screen.getByText('100')).toBeInTheDocument();
      // 100/200 = 50%, should show warning color
    });
  });
});

