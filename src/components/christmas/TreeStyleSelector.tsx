import { TrendingUp, TreePine } from 'lucide-react';

export type TreeStyle = 'kline' | 'christmas';

interface TreeStyleSelectorProps {
  treeStyle: TreeStyle;
  onStyleChange: (style: TreeStyle) => void;
}

export function TreeStyleSelector({ treeStyle, onStyleChange }: TreeStyleSelectorProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="glass-gold rounded-2xl p-1.5 flex gap-1">
        <button
          onClick={() => onStyleChange('kline')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300
            ${treeStyle === 'kline' 
              ? 'bg-gradient-to-r from-green-500/30 to-red-500/30 text-foreground shadow-lg' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }
          `}
        >
          <TrendingUp className={`w-5 h-5 ${treeStyle === 'kline' ? 'text-green-400' : ''}`} />
          <span className="text-sm font-medium">K线圣诞树</span>
        </button>
        
        <button
          onClick={() => onStyleChange('christmas')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300
            ${treeStyle === 'christmas' 
              ? 'bg-christmas-green/30 text-foreground shadow-lg' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }
          `}
        >
          <TreePine className={`w-5 h-5 ${treeStyle === 'christmas' ? 'text-christmas-green' : ''}`} />
          <span className="text-sm font-medium">经典圣诞树</span>
        </button>
      </div>
    </div>
  );
}
